import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { AlertTriangle, CheckCircle, Play, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useAiopsExecuteActionMutation } from '../hooks/useAIOps';
import { AiopsRcaSuggestedAction } from '../types/aiops.types';

export interface AIOpsActionCardProps {
  action: AiopsRcaSuggestedAction;
  incidentId?: string;
  onSuccess?: () => void;
}

export const AIOpsActionCard = ({ action, incidentId, onSuccess }: AIOpsActionCardProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);

  const executeMutation = useAiopsExecuteActionMutation();

  const handleExecute = async () => {
    try {
      const res = await executeMutation.mutateAsync({
        incidentId,
        actionType: action.actionType as
          | 'K8S_DEPLOYMENT_RESTART'
          | 'K8S_DEPLOYMENT_SCALE'
          | 'K8S_POD_DELETE'
          | 'CACHE_FLUSH_REDIS',
        targetResource:
          (action.payloadParameters?.deployment as string) ||
          (action.payloadParameters?.resource as string) ||
          'production/default',
        parameters: action.payloadParameters,
        userConfirmation: true,
      });

      setExecutionResult(res.message);
      setConfirmOpen(false);
      onSuccess?.();
    } catch {
      // Erro é tratado e renderizado via executeMutation.isError
    }
  };

  const getRiskChip = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (level) {
      case 'LOW':
        return <Chip label="Risco Baixo" color="success" size="small" variant="outlined" />;
      case 'MEDIUM':
        return <Chip label="Risco Moderado" color="warning" size="small" variant="outlined" />;
      case 'HIGH':
        return <Chip label="Risco Elevado" color="error" size="small" variant="filled" />;
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 2,
        borderRadius: 2,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ShieldAlert size={18} color="#f59e0b" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {action.title}
              </Typography>
            </Stack>
            {getRiskChip(action.riskLevel)}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {action.description}
          </Typography>

          {/* Pré-visualização do comando seguro */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflowX: 'auto',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <code>{action.commandPreview}</code>
          </Box>

          {executionResult ? (
            <Alert icon={<CheckCircle size={18} />} severity="success" sx={{ py: 0.5 }}>
              {executionResult}
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={<Play size={15} />}
                onClick={() => setConfirmOpen(true)}
                disabled={executeMutation.isPending}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Aprovar e Executar Ação
              </Button>
            </Box>
          )}

          {executeMutation.isError && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              Falha na execução: {executeMutation.error.message}
            </Alert>
          )}
        </Stack>
      </CardContent>

      {/* Modal de Confirmação Obrigatória (Human-in-the-Loop) */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle color="#ea580c" size={22} />
          Confirmação de Ação Remediadora
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Você está prestes a autorizar a execução da remediação proposta pelo AIOps Copilot:
          </DialogContentText>
          <Box
            sx={{
              my: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          >
            {action.commandPreview}
          </Box>
          <DialogContentText variant="caption" color="text.secondary">
            Esta operação será assinada pelo seu usuário administrador e registrada de forma
            imutável na trilha de auditoria do sistema (ADR-012/ADR-018).
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            color="inherit"
            disabled={executeMutation.isPending}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExecute}
            variant="contained"
            color="warning"
            disabled={executeMutation.isPending}
            startIcon={
              executeMutation.isPending ? <CircularProgress size={16} /> : <CheckCircle size={16} />
            }
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {executeMutation.isPending ? 'Executando...' : 'Confirmar e Disparar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
