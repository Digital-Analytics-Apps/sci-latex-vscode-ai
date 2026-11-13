import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  X,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import type { ScientificPaperNodeData } from '../types';

interface PaperAnalysisDrawerProps {
  paper: ScientificPaperNodeData | null;
  open: boolean;
  onClose: () => void;
}

export const PaperAnalysisDrawer: React.FC<PaperAnalysisDrawerProps> = ({
  paper,
  open,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!paper) return null;

  const bibtexKey = `${paper.authors[0]?.toLowerCase().replace(/\s+/g, '') || 'autor'}${paper.year}`;
  const bibtexEntry = `@article{${bibtexKey},
  title = {${paper.title}},
  author = {${paper.authors.join(' and ')}},
  year = {${paper.year}},
  ${paper.venue ? `journal = {${paper.venue}},` : ''}
  ${paper.doi ? `doi = {${paper.doi}},` : ''}
  ${paper.arxivUrl ? `url = {${paper.arxivUrl}}` : ''}
}`;

  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(bibtexEntry);
    setCopied(true);
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: { width: { xs: '100%', sm: 540 }, p: 3 },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GraduationCap size={22} color="#1976d2" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Ficha Científica Estruturada
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={18} />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Metadados do Artigo */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3, mb: 1 }}>
            {paper.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {paper.authors.join(', ')} ({paper.year})
          </Typography>
          {paper.venue && (
            <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', fontWeight: 600, mb: 1 }}>
              {paper.venue}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {paper.arxivUrl && (
              <Button
                variant="outlined"
                size="small"
                href={paper.arxivUrl}
                target="_blank"
                rel="noreferrer"
                endIcon={<ExternalLink size={13} />}
                sx={{ fontSize: '0.72rem', textTransform: 'none' }}
              >
                Ver no arXiv
              </Button>
            )}
            {paper.pdfUrl && (
              <Button
                variant="contained"
                size="small"
                href={paper.pdfUrl}
                target="_blank"
                rel="noreferrer"
                endIcon={<ExternalLink size={13} />}
                sx={{ fontSize: '0.72rem', textTransform: 'none' }}
              >
                Abrir PDF
              </Button>
            )}
          </Box>
        </Box>

        {/* Resumo Executivo */}
        {paper.executiveSummary && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Resumo Executivo (SciAI)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
              {paper.executiveSummary}
            </Typography>
          </Box>
        )}

        {/* Metodologia & Achados */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8 }}>
            Metodologia & Métricas Concretas
          </Typography>
          {paper.studyType && (
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Tipo de Estudo:</strong> {paper.studyType}
            </Typography>
          )}
          {paper.empiricalMetrics && (
            <Alert severity="info" sx={{ fontSize: '0.8rem', py: 0.5, mb: 1 }}>
              <strong>Métricas Comprovadas:</strong> {paper.empiricalMetrics}
            </Alert>
          )}
        </Box>

        {/* Auditoria Crítica: Pontos Fortes e Fracos */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Auditoria Crítica de Rigor (Methodology Reviewer)
          </Typography>

          {/* Pontos Fortes */}
          <Box sx={{ p: 1.5, mb: 1.5, bgcolor: 'rgba(46, 125, 50, 0.08)', borderRadius: 2, borderLeft: '4px solid #2e7d32' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
              <CheckCircle2 size={18} color="#2e7d32" />
              <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                Pontos Fortes & Rigor Identificado
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {paper.strengths.map((str, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.78rem' }}>
                  • {str}
                </Typography>
              ))}
            </Box>
          </Box>

          {/* Limitações e Ameaças */}
          <Box sx={{ p: 1.5, bgcolor: 'rgba(211, 47, 47, 0.08)', borderRadius: 2, borderLeft: '4px solid #d32f2f' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
              <AlertTriangle size={18} color="#d32f2f" />
              <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 700 }}>
                Limitações Declaradas & Ameaças à Validade
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {paper.declaredLimitations.map((lim, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.78rem' }}>
                  • {lim}
                </Typography>
              ))}
              {paper.internalValidityThreats?.map((th, i) => (
                <Typography key={`int-${i}`} variant="caption" sx={{ display: 'block', fontSize: '0.78rem', color: '#c62828' }}>
                  ⚠️ Validade Interna: {th}
                </Typography>
              ))}
              {paper.externalValidityThreats?.map((th, i) => (
                <Typography key={`ext-${i}`} variant="caption" sx={{ display: 'block', fontSize: '0.78rem', color: '#c62828' }}>
                  ⚠️ Validade Externa: {th}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Citação BibTeX */}
        <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Citação BibTeX para o seu manuscrito:
            </Typography>
            <Button
              size="small"
              startIcon={<Copy size={14} />}
              onClick={handleCopyBibtex}
              sx={{ fontSize: '0.72rem', textTransform: 'none' }}
            >
              Copiar BibTeX
            </Button>
          </Box>
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              fontFamily: 'monospace',
              fontSize: '0.72rem',
              whiteSpace: 'pre-wrap',
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {bibtexEntry}
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        message="Citação BibTeX copiada para a área de transferência!"
      />
    </>
  );
};
