import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SchoolIcon from '@mui/icons-material/School';
import type { ArticleProposalData } from '../types/chat.types';

interface StageTimelineProposalCardProps {
  proposal: ArticleProposalData;
  onApprove: (proposal: ArticleProposalData) => void;
  disabled?: boolean;
}

export const StageTimelineProposalCard: React.FC<StageTimelineProposalCardProps> = ({
  proposal,
  onApprove,
  disabled = false,
}) => {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'success.light',
        boxShadow: 2,
        mt: 1.5,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RocketLaunchIcon color="success" sx={{ fontSize: 22 }} />
            <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 700 }}>
              Proposta Consolidada do Artigo Científico
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {proposal.conference && (
              <Chip
                size="small"
                icon={<SchoolIcon sx={{ fontSize: 14 }} />}
                label={proposal.conference}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
            {proposal.template_id && (
              <Chip
                size="small"
                label={`Template: ${proposal.template_id.toUpperCase()}`}
                color="secondary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
            {proposal.coordinator_name && (
              <Chip
                size="small"
                label={`Orientador: ${proposal.coordinator_name}`}
                color="info"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
            {proposal.manager_name && (
              <Chip
                size="small"
                label={`Gerente: ${proposal.manager_name}`}
                color="default"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
            {proposal.reviewer_name && (
              <Chip
                size="small"
                label={`Revisor: ${proposal.reviewer_name}`}
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Título formulado pela IA */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            TÍTULO FORMULADO PELA IA:
          </Typography>
          <Typography variant="body1" color="text.primary" sx={{ fontWeight: 700, mt: 0.25 }}>
            {proposal.title}
          </Typography>
        </Box>

        {/* Abstract/Resumo */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            mb: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            ABSTRACT / RESUMO PROPOSTO:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontStyle: 'italic' }}>
            "{proposal.abstract}"
          </Typography>
        </Paper>

        {/* Cronograma das 6 Etapas Fixas (ADR-008) */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
            CRONOGRAMA CALCULADO NAS 6 ETAPAS FIXAS (ADR 008):
          </Typography>

          <Stack spacing={1}>
            {proposal.stages.map((stg) => (
              <Box
                key={stg.order}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  px: 1.5,
                  borderRadius: 1.5,
                  bgcolor: stg.is_gatekeeper ? 'warning.light' : 'background.default',
                  border: '1px solid',
                  borderColor: stg.is_gatekeeper ? 'warning.main' : 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, width: 60 }}>
                    Etapa {stg.order}:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: stg.is_gatekeeper ? 700 : 500 }}>
                    {stg.title}
                  </Typography>
                  {stg.is_gatekeeper && (
                    <Chip
                      size="small"
                      icon={<LockOutlinedIcon sx={{ fontSize: 12 }} />}
                      label={stg.gatekeeper_type || 'Gatekeeper'}
                      color="warning"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {stg.planned_days} dias (dia {stg.cumulative_day})
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Botão de Aprovação Final */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button
            variant="contained"
            color="success"
            size="medium"
            disabled={disabled}
            onClick={() => onApprove(proposal)}
            startIcon={<CheckCircleIcon />}
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
          >
            Aprovar Proposta e Criar Projeto
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
