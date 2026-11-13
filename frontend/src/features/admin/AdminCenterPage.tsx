import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  Activity,
  Cpu,
  Layers,
  LayoutDashboard,
  Radio,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ADMIN_CENTER_KEYS } from "./hooks/useAdminCenterQueries";
import { OverviewTab } from "./tabs/OverviewTab";
import { WorkflowTab } from "./tabs/WorkflowTab";
import { InfrastructureTab } from "./tabs/InfrastructureTab";
import { CollaborationTab } from "./tabs/CollaborationTab";
import { ActivityTab } from "./tabs/ActivityTab";

export const AdminCenterPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ADMIN_CENTER_KEYS.all });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Top Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
          }}
        >
          <Box>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center", mb: 0.5 }}
            >
              <ShieldCheck size={28} color="#2563eb" />
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                SCIA Admin Center
              </Typography>
              <Chip
                label="Role.ADMIN"
                color="primary"
                size="small"
                sx={{ fontWeight: 700, fontSize: "0.75rem" }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Central Integrada de Observabilidade, Operação da Plataforma e Governança Científica
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Chip
              label={autoRefresh ? "Auto-Refresh: 15s" : "Auto-Refresh: Pausado"}
              color={autoRefresh ? "success" : "default"}
              variant="outlined"
              onClick={() => setAutoRefresh(!autoRefresh)}
              sx={{ cursor: "pointer", fontWeight: 600 }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<RefreshCw size={16} />}
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              Atualizar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newTab) => setCurrentTab(newTab)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<LayoutDashboard size={18} />} iconPosition="start" label="1. Visão Geral" />
          <Tab icon={<Layers size={18} />} iconPosition="start" label="2. Fluxo Científico" />
          <Tab icon={<Cpu size={18} />} iconPosition="start" label="3. Infraestrutura" />
          <Tab icon={<Radio size={18} />} iconPosition="start" label="4. Colaboração em Tempo Real" />
          <Tab icon={<Activity size={18} />} iconPosition="start" label="5. Atividade & Auditoria" />
        </Tabs>
      </Box>

      {/* Tab Contents */}
      <Box sx={{ mt: 2 }}>
        {currentTab === 0 && <OverviewTab autoRefresh={autoRefresh} />}
        {currentTab === 1 && <WorkflowTab autoRefresh={autoRefresh} />}
        {currentTab === 2 && <InfrastructureTab autoRefresh={autoRefresh} />}
        {currentTab === 3 && <CollaborationTab autoRefresh={autoRefresh} />}
        {currentTab === 4 && <ActivityTab autoRefresh={autoRefresh} />}
      </Box>
    </Container>
  );
};
