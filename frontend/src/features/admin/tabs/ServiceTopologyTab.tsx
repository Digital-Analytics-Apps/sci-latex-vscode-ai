import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  Bot,
  Cpu,
  Network,
  Radio,
  Square,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { ServiceTopologyFlow } from '../components/topology/ServiceTopologyFlow';
import { SIMULATION_SCENARIOS } from '../components/topology/topologyConfig';
import type { RequestSimulationScenario, TraceStep } from '../components/topology/types';
import {
  useAdminCollaboration,
  useAdminInfrastructure,
} from '../hooks/useAdminCenterQueries';
import { useAdminTrafficStream } from '../hooks/useAdminTrafficStream';

export interface ServiceTopologyTabProps {
  autoRefresh: boolean;
  onInvestigate?: (serviceName: string) => void;
}

export const ServiceTopologyTab: React.FC<ServiceTopologyTabProps> = ({
  autoRefresh,
}) => {
  const {
    data: infraData,
    isLoading: isLoadingInfra,
    isError: isErrorInfra,
  } = useAdminInfrastructure(autoRefresh);

  const {
    data: collabData,
    isLoading: isLoadingCollab,
  } = useAdminCollaboration(autoRefresh);

  // Estados de Rastreamento e Simulação de Tráfego
  const [activeScenario, setActiveScenario] = useState<RequestSimulationScenario | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [activeTraceStep, setActiveTraceStep] = useState<TraceStep | null>(null);
  const [activeProcessingNodeIds, setActiveProcessingNodeIds] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveEventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manipulador de eventos reais disparados por autores no cluster via SSE
  const handleLiveTrafficEvent = (step: TraceStep) => {
    if (!activeScenario) {
      if (liveEventTimerRef.current) {
        clearTimeout(liveEventTimerRef.current);
      }
      setActiveTraceStep(step);

      // Mantém os nós em processamento ativos durante toda a duração da tarefa
      if (step.processingNodeIds && step.processingNodeIds.length > 0) {
        setActiveProcessingNodeIds(step.processingNodeIds);
      } else if (step.targetNodeId === 'compiler-worker' && step.direction === 'forward') {
        setActiveProcessingNodeIds(['compiler-worker']);
      } else if (step.targetNodeId === 'sciai-engine' && step.direction === 'forward') {
        setActiveProcessingNodeIds(['sciai-engine']);
      } else if (
        (step.edgeId === 'e-frontend-backend' && step.direction === 'backward') ||
        (step.processingNodeIds && step.processingNodeIds.length === 0)
      ) {
        setActiveProcessingNodeIds([]);
      }

      // Timeout de segurança (35s) caso haja queda de rede ou stream de IA prolongado
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = setTimeout(() => {
        setActiveProcessingNodeIds([]);
      }, 35000);

      liveEventTimerRef.current = setTimeout(() => {
        setActiveTraceStep(null);
      }, step.durationMs || 1500);
    }
  };

  const { isConnected: isLiveConnected } =
    useAdminTrafficStream(handleLiveTrafficEvent);

  // Execução passo a passo da simulação
  const runStep = (scenario: RequestSimulationScenario, stepIdx: number) => {
    if (stepIdx >= scenario.steps.length) {
      setActiveScenario(null);
      setCurrentStepIndex(-1);
      setActiveTraceStep(null);
      setActiveProcessingNodeIds([]);
      return;
    }

    const step = scenario.steps[stepIdx];
    setCurrentStepIndex(stepIdx);
    setActiveTraceStep(step);
    if (step.processingNodeIds) {
      setActiveProcessingNodeIds(step.processingNodeIds);
    }

    timerRef.current = setTimeout(() => {
      runStep(scenario, stepIdx + 1);
    }, step.durationMs);
  };

  const handleStartSimulation = (scenario: RequestSimulationScenario) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setActiveScenario(scenario);
    runStep(scenario, 0);
  };

  const handleStopSimulation = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    setActiveScenario(null);
    setCurrentStepIndex(-1);
    setActiveTraceStep(null);
    setActiveProcessingNodeIds([]);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (liveEventTimerRef.current) clearTimeout(liveEventTimerRef.current);
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    };
  }, []);

  if ((isLoadingInfra && !infraData) || (isLoadingCollab && !collabData)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isErrorInfra || !infraData) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">
          Erro ao carregar telemetria da malha de microsserviços.
        </Typography>
      </Paper>
    );
  }

  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case 'compiler':
        return <Cpu size={14} />;
      case 'sciai':
        return <Bot size={14} />;
      case 'collab':
      default:
        return <Zap size={14} />;
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Barra Compacta de Controle de Tráfego e Status (Sem cards volumosos) */}
      <Paper
        elevation={1}
        sx={{
          p: 1.25,
          px: 2,
          mb: 1.5,
          borderRadius: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Status da Malha e Telemetria SSE */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Network size={20} color="#6366f1" />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Malha de Serviços (Tempo Real)
          </Typography>
          <Chip
            icon={<Radio size={12} className={isLiveConnected ? 'animate-pulse' : undefined} />}
            label={isLiveConnected ? 'Telemetria Real Conectada' : 'Telemetria Offline'}
            size="small"
            color={isLiveConnected ? 'success' : 'default'}
            sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
          />
          {activeScenario && (
            <Chip
              label={`Passo ${currentStepIndex + 1}/${activeScenario.steps.length}: ${activeTraceStep?.description || ''}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
            />
          )}
        </Stack>

        {/* Cenários de Rastreamento de Fluxo */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>
            Rastrear Fluxo:
          </Typography>
          {SIMULATION_SCENARIOS.map((scenario) => {
            const isCurrent = activeScenario?.id === scenario.id;
            return (
              <Button
                key={scenario.id}
                variant={isCurrent ? 'contained' : 'outlined'}
                color="primary"
                size="small"
                startIcon={getScenarioIcon(scenario.iconName)}
                onClick={() => handleStartSimulation(scenario)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  py: 0.25,
                  px: 1,
                  height: 26,
                }}
              >
                {scenario.name}
              </Button>
            );
          })}

          {activeScenario && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Square size={12} />}
              onClick={handleStopSimulation}
              sx={{ textTransform: 'none', fontWeight: 600, height: 26, fontSize: '0.75rem' }}
            >
              Parar
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Container Full-Viewport com AutoSizer para o React Flow */}
      <Box sx={{ flex: 1, width: '100%', minHeight: 0, position: 'relative' }}>
        <AutoSizer
          renderProp={({ width, height }) => (
            <ServiceTopologyFlow
              width={width ?? 1200}
              height={height ?? 800}
              infraData={infraData}
              collabData={collabData}
              activeTraceStep={activeTraceStep}
              activeProcessingNodeIds={activeProcessingNodeIds}
            />
          )}
        />
      </Box>
    </Box>
  );
};
