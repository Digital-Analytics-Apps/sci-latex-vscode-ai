import React from 'react';
import { Box, Typography } from '@mui/material';
import { ArticleSelectionCard } from './ArticleSelectionCard';
import { StageTimelineProposalCard } from './StageTimelineProposalCard';
import type {
  ArticleItem,
  ArticleProposalData,
  InterruptActionRequest,
} from '../types/chat.types';

interface InterruptActionResolverProps {
  interrupt: InterruptActionRequest;
  onSubmitDecision: (decision: Record<string, unknown>) => void;
  disabled?: boolean;
}

export const InterruptActionResolver: React.FC<InterruptActionResolverProps> = ({
  interrupt,
  onSubmitDecision,
  disabled = false,
}) => {
  const { name, args } = interrupt;

  // 1. Caso de Seleção de Artigos Científicos (arXiv / S2 / OpenAlex)
  if (name === 'present_articles_to_user_for_selection') {
    const rawArticles = args.articles;
    const articles = Array.isArray(rawArticles) ? (rawArticles as ArticleItem[]) : [];

    const handleConfirmArticles = (selectedArticles: ArticleItem[]) => {
      onSubmitDecision({
        decisions: [
          {
            type: 'approve',
            args: { selected_articles: selectedArticles },
          },
        ],
        selected_articles: selectedArticles,
      });
    };

    return (
      <ArticleSelectionCard
        articles={articles}
        onConfirmSelection={handleConfirmArticles}
        disabled={disabled}
      />
    );
  }

  // 2. Caso de Aprovação da Proposta Estruturada do Artigo (Título, Abstract, 6 Etapas)
  if (name === 'approve_article_proposal') {
    const proposal = args as unknown as ArticleProposalData;

    const handleApproveProposal = (approved: ArticleProposalData) => {
      onSubmitDecision({
        type: 'approve',
        proposal: approved,
      });
    };

    return (
      <StageTimelineProposalCard
        proposal={proposal}
        onApprove={handleApproveProposal}
        disabled={disabled}
      />
    );
  }

  // 3. Fallback genérico para outras ações
  return (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary">
        Ação pendente: {name}
      </Typography>
    </Box>
  );
};
