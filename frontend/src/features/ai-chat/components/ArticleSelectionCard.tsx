import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import type { ArticleItem } from '../types/chat.types';

interface ArticleSelectionCardProps {
  articles: ArticleItem[];
  onConfirmSelection: (selected: ArticleItem[]) => void;
  disabled?: boolean;
}

export const ArticleSelectionCard: React.FC<ArticleSelectionCardProps> = ({
  articles,
  onConfirmSelection,
  disabled = false,
}) => {
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(() => {
    // Por padrão pré-seleciona os 3 primeiros para conveniência do autor
    return new Set(articles.slice(0, 3).map((a) => a.url));
  });

  const toggleArticle = (url: string) => {
    if (disabled) return;
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = articles.filter((a) => selectedUrls.has(a.url));
    onConfirmSelection(selected);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'primary.light',
        boxShadow: 2,
        mt: 1.5,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700 }}>
              📚 Artigos Científicos Encontrados ({articles.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Selecione os artigos que deseja utilizar como base referencial no seu manuscrito.
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${selectedUrls.size} selecionado(s)`}
            color={selectedUrls.size > 0 ? 'primary' : 'default'}
            sx={{ fontWeight: 600 }}
          />
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        <Stack spacing={1.5}>
          {articles.map((art, idx) => {
            const isSelected = selectedUrls.has(art.url);
            return (
              <Box
                key={art.url || idx}
                onClick={() => toggleArticle(art.url)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'action.selected' : 'background.default',
                  cursor: disabled ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Checkbox
                    checked={isSelected}
                    disabled={disabled}
                    size="small"
                    sx={{ p: 0.5, mt: -0.25 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {art.title}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, my: 0.75 }}>
                      <Typography variant="caption" color="text.secondary">
                        {art.authors.slice(0, 3).join(', ')}
                        {art.authors.length > 3 ? ' et al.' : ''}
                      </Typography>

                      {art.year && (
                        <Chip size="small" label={art.year} sx={{ height: 18, fontSize: '0.65rem' }} />
                      )}

                      {art.venue && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={art.venue}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {art.snippet}
                    </Typography>

                    <Box
                      sx={{ display: 'flex', gap: 1.5, mt: 1 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {art.url && (
                        <Link
                          href={art.url}
                          target="_blank"
                          rel="noreferrer"
                          variant="caption"
                          underline="hover"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                        >
                          <OpenInNewIcon sx={{ fontSize: 12 }} /> Abstract
                        </Link>
                      )}
                      {art.pdf_url && (
                        <Link
                          href={art.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          variant="caption"
                          underline="hover"
                          color="error.main"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                        >
                          <PictureAsPdfIcon sx={{ fontSize: 12 }} /> PDF Direto
                        </Link>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={selectedUrls.size === 0 || disabled}
            onClick={handleConfirm}
            startIcon={<CheckCircleOutlinedIcon />}
          >
            Confirmar {selectedUrls.size} Artigo(s)
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
