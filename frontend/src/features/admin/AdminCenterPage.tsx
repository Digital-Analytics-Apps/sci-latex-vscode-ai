import { Box, Button, Chip, Container, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Bot,
  Cpu,
  Layers,
  LayoutDashboard,
  Radio,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { AIOpsChatDrawer } from './components/AIOpsChatDrawer';
import { ADMIN_CENTER_KEYS } from './hooks/useAdminCenterQueries';
import { ActivityTab } from './tabs/ActivityTab';
import { CollaborationTab } from './tabs/CollaborationTab';
import { InfrastructureTab } from './tabs/InfrastructureTab';
import { OverviewTab } from './tabs/OverviewTab';
import { WorkflowTab } from './tabs/WorkflowTab';

export const AdminCenterPage = () => {
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Top Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <ShieldCheck size={28} color="#2563eb" />
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                SCIA Admin Center
              </Typography>
              <Chip
                label="Role.ADMIN"
                color="primary"
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Central Integrada de Observabilidade, Operação da Plataforma e Governança Científica
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Bot size={16} />}
              onClick={() => {
                setAiopsServiceContext(null);
                setAiopsIncidentId(null);
                setAiopsOpen(true);
              }}
              sx={{ fontWeight: 700, textTransform: 'none', px: 2 }}
            >
              AIOps Copilot
            </Button>

            <Chip
              label={autoRefresh ? 'Auto-Refresh: 15s' : 'Auto-Refresh: Pausado'}
              color={autoRefresh ? 'success' : 'default'}
              variant="outlined"
              onClick={() => setAutoRefresh(!autoRefresh)}
              sx={{ cursor: 'pointer', fontWeight: 600 }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={16} />}
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              sx={{ textTransform: 'none' }}
            >
              Atualizar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newTab) => setCurrentTab(newTab)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<LayoutDashboard size={18} />} iconPosition="start" label="1. Visão Geral" />
          <Tab icon={<Layers size={18} />} iconPosition="start" label="2. Fluxo Científico" />
          <Tab icon={<Cpu size={18} />} iconPosition="start" label="3. Infraestrutura" />
          <Tab
            icon={<Radio size={18} />}
            iconPosition="start"
            label="4. Colaboração em Tempo Real"
          />
          <Tab
            icon={<Activity size={18} />}
            iconPosition="start"
            label="5. Atividade & Auditoria"
          />
        </Tabs>
      </Box>

      {/* Tab Contents */}
      <Box sx={{ mt: 2 }}>
        {currentTab === 0 && <OverviewTab autoRefresh={autoRefresh} />}
        {currentTab === 1 && <WorkflowTab autoRefresh={autoRefresh} />}
        {currentTab === 2 && (
          <InfrastructureTab autoRefresh={autoRefresh} onInvestigate={handleOpenAiopsForService} />
        )}
        {currentTab === 3 && <CollaborationTab autoRefresh={autoRefresh} />}
        {currentTab === 4 && <ActivityTab autoRefresh={autoRefresh} />}
      </Box>

      {/* AIOps Copilot Interactive Drawer */}
      <AIOpsChatDrawer
        open={aiopsOpen}
        onClose={() => setAiopsOpen(false)}
        targetIncidentId={aiopsIncidentId}
        targetServiceContext={aiopsServiceContext}
      />
    </Container>
  );
};
