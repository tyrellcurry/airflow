/*!
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Box, HStack, Flex, VStack } from "@chakra-ui/react";
import { useReactFlow } from "@xyflow/react";
import type { PropsWithChildren, ReactNode } from "react";
import { LuFileWarning } from "react-icons/lu";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Outlet, useParams } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";

import { useDagServiceGetDag, useDagWarningServiceListDagWarnings } from "openapi/queries";
import type { DAGResponse } from "openapi/requests/types.gen";
import BackfillBanner from "src/components/Banner/BackfillBanner";
import { ErrorAlert } from "src/components/ErrorAlert";
import { SearchDagsButton } from "src/components/SearchDags";
import { StateBadge } from "src/components/StateBadge";
import TriggerDAGButton from "src/components/TriggerDag/TriggerDAGButton";
import { WarningAlert } from "src/components/WarningAlert";
import { Accordion, Button, ProgressBar } from "src/components/ui";
import { Toaster } from "src/components/ui";
import { OpenGroupsProvider } from "src/context/openGroups";

import { DagBreadcrumb } from "./DagBreadcrumb";
import { Graph } from "./Graph";
import { Grid } from "./Grid";
import { NavTabs } from "./NavTabs";
import { PanelButtons } from "./PanelButtons";

type Props = {
  readonly dag?: DAGResponse;
  readonly error?: unknown;
  readonly isLoading?: boolean;
  readonly tabs: Array<{ icon: ReactNode; label: string; value: string }>;
} & PropsWithChildren;

export const DetailsLayout = ({ children, error, isLoading, tabs }: Props) => {
  const { dagId = "" } = useParams();

  const { data: dag } = useDagServiceGetDag({ dagId });
  const [defaultDagView] = useLocalStorage<"graph" | "grid">("default_dag_view", "grid");
  const [dagView, setDagView] = useLocalStorage<"graph" | "grid">(`dag_view-${dagId}`, defaultDagView);

  const { fitView, getZoom } = useReactFlow();

  const { data: warningData } = useDagWarningServiceListDagWarnings({
    dagId,
  });

  return (
    <OpenGroupsProvider dagId={dagId}>
      <HStack justifyContent="space-between" mb={2}>
        <DagBreadcrumb />
        <Flex gap={1}>
          <SearchDagsButton />
          {dag === undefined ? undefined : <TriggerDAGButton dag={dag} />}
        </Flex>
      </HStack>
      <Toaster />
      <BackfillBanner dagId={dagId} />
      <Box flex={1} minH={0}>
        <PanelGroup autoSaveId={dagId} direction="horizontal">
          <Panel defaultSize={dagView === "graph" ? 70 : 20} minSize={6}>
            <Box height="100%" position="relative" pr={2}>
              <PanelButtons dagView={dagView} setDagView={setDagView} />
              {dagView === "graph" ? <Graph /> : <Grid />}
            </Box>
          </Panel>
          <PanelResizeHandle
            className="resize-handle"
            onDragging={(isDragging) => {
              if (!isDragging) {
                const zoom = getZoom();

                void fitView({ maxZoom: zoom, minZoom: zoom });
              }
            }}
          >
            <Box bg="fg.subtle" cursor="col-resize" h="100%" transition="background 0.2s" w={0.5} />
          </PanelResizeHandle>
          <Panel defaultSize={dagView === "graph" ? 30 : 80} minSize={20}>
            <Box display="flex" flexDirection="column" h="100%">
              {children}
              {(Boolean(error) || (warningData?.dag_warnings.length ?? 0) > 0) && (
                <Accordion.Root collapsible mb={4} mt={4} size="lg" variant="outline">
                  <Accordion.Item key="dagIssues" mx={2} value="dagIssues">
                    <Accordion.ItemTrigger cursor="button">
                      <Flex gap="0.5rem">
                        <StateBadge as={Button} colorPalette="failed" height={7} title="Dag Issues">
                          <LuFileWarning size="0.5rem" />
                        </StateBadge>
                        <p>Issues</p>
                      </Flex>
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <VStack>
                        <ErrorAlert error={error} />
                        {warningData?.dag_warnings.map((warningItem) => (
                          <WarningAlert
                            key={`${warningItem.dag_id}-${warningItem.timestamp}`}
                            warning={warningItem}
                          />
                        ))}
                      </VStack>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                </Accordion.Root>
              )}
              <ProgressBar size="xs" visibility={isLoading ? "visible" : "hidden"} />
              <NavTabs tabs={tabs} />
              <Box h="100%" overflow="auto" px={2}>
                <Outlet />
              </Box>
            </Box>
          </Panel>
        </PanelGroup>
      </Box>
    </OpenGroupsProvider>
  );
};
