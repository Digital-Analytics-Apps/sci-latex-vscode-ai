import { Box, Button, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Bot,
  Cpu,
  FileCode,
  Layers,
  LayoutDashboard,
  Network,
  Radio,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import { AIOpsChatDrawer } from './components/AIOpsChatDrawer';
import { ADMIN_CENTER_KEYS } from './hooks/useAdminCenterQueries';
import { ActivityTab } from './tabs/ActivityTab';
import { CollaborationTab } from './tabs/CollaborationTab';
import { InfrastructureTab } from './tabs/InfrastructureTab';
import { OverviewTab } from './tabs/OverviewTab';
import { ServiceTopologyTab } from './tabs/ServiceTopologyTab';
import { TemplatesTab } from './tabs/TemplatesTab';
import { WorkflowTab } from './tabs/WorkflowTab';

export const AdminCenterPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Estados do AIOps Copilot Drawer
  const [aiopsOpen, setAiopsOpen] = useState<boolean>(false);
  const [aiopsServiceContext, setAiopsServiceContext] = useState<string | null>(null);
  const [aiopsIncidentId, setAiopsIncidentId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ADMIN_CENTER_KEYS.all });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOpenAiopsForService = (serviceName: string) => {
    setAiopsServiceContext(serviceName);
    setAiopsIncidentId(null);
    setAiopsOpen(true);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        width: '100%',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* Sidebar Lateral de Navegação (Elimina cards volumosos no topo) */}
      <Box
        component="aside"
        sx={{
          width: 250,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Header Compacto da Sidebar */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
            <ShieldCheck size={22} color="#2563eb" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              SCIA Admin
            </Typography>
            <Chip
              label="ADMIN"
              color="primary"
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
            />
          </Stack>

          {/* Abas Verticais de Navegação */}
          <Tabs
            orientation="vertical"
            value={currentTab}
            onChange={(_, newTab) => setCurrentTab(newTab)}
            sx={{
              '& .MuiTab-root': {
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: 'left',
                minHeight: 44,
                py: 1,
                px: 1.5,
                borderRadius: 1.5,
                fontSize: '0.82rem',
                fontWeight: 600,
                textTransform: 'none',
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                  fontWeight: 800,
                },
              },
              '& .MuiTabs-indicator': {
                left: 0,
                width: 3.5,
                borderRadius: '0 4px 4px 0',
              },
            }}
          >
            <Tab icon={<LayoutDashboard size={17} />} iconPosition="start" label="1. Visão Geral" />
            <Tab icon={<Layers size={17} />} iconPosition="start" label="2. Fluxo Científico" />
            <Tab icon={<Cpu size={17} />} iconPosition="start" label="3. Infraestrutura" />
            <Tab icon={<Radio size={17} />} iconPosition="start" label="4. Colaboração" />
            <Tab icon={<Activity size={17} />} iconPosition="start" label="5. Auditoria" />
            <Tab
              icon={<Network size={17} />}
              iconPosition="start"
              label="6. Topologia de Rede"
              sx={{
                border: '1px dashed',
                borderColor: currentTab === 5 ? 'primary.main' : 'divider',
              }}
            />
            <Tab icon={<FileCode size={17} />} iconPosition="start" label="7. Templates LaTeX" />
          </Tabs>
        </Box>

        {/* Rodapé da Sidebar com Controles de Telemetria e AIOps */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              fullWidth
              startIcon={<Bot size={16} />}
              onClick={() => {
                setAiopsServiceContext(null);
                setAiopsIncidentId(null);
                setAiopsOpen(true);
              }}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              AIOps Copilot
            </Button>

            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Chip
                label={autoRefresh ? 'Auto: 15s' : 'Pausado'}
                color={autoRefresh ? 'success' : 'default'}
                variant="outlined"
                size="small"
                onClick={() => setAutoRefresh(!autoRefresh)}
                sx={{ cursor: 'pointer', fontWeight: 600, flex: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                sx={{ minWidth: 'auto', px: 1, height: 28 }}
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : undefined} />
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Área Principal de Conteúdo (100% da tela para o React Flow na Tab 6) */}
      <Box
        component="main"
        sx={{
          flex: 1,
          height: '100%',
          minWidth: 0,
          overflow: currentTab === 5 ? 'hidden' : 'auto',
          p: currentTab === 5 ? 1.5 : 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {currentTab === 0 && <OverviewTab autoRefresh={autoRefresh} />}
        {currentTab === 1 && <WorkflowTab autoRefresh={autoRefresh} />}
        {currentTab === 2 && (
          <InfrastructureTab autoRefresh={autoRefresh} onInvestigate={handleOpenAiopsForService} />
        )}
        {currentTab === 3 && <CollaborationTab autoRefresh={autoRefresh} />}
        {currentTab === 4 && <ActivityTab autoRefresh={autoRefresh} />}
        {currentTab === 5 && (
          <ServiceTopologyTab autoRefresh={autoRefresh} onInvestigate={handleOpenAiopsForService} />
        )}
        {currentTab === 6 && <TemplatesTab />}
      </Box>

      {/* AIOps Copilot Interactive Drawer */}
      <AIOpsChatDrawer
        open={aiopsOpen}
        onClose={() => setAiopsOpen(false)}
        targetIncidentId={aiopsIncidentId}
        targetServiceContext={aiopsServiceContext}
      />
    </Box>
  );
};
