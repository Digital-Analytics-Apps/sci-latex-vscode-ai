import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Download, FileCode, FileUp, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { GenericDataGrid } from '../../../components/common/GenericDataGrid';
import { StandardModal } from '../../../components/common/StandardModal';
import {
  useDeleteTemplateMutation,
  useTemplatesQuery,
  useUploadTemplateMutation,
} from '../../../hooks/useTemplateQueries';
import { templatesService } from '../../../services/templatesService';
import { showNotification } from '../../../store/slices/notificationSlice';
import type { LatexTemplateItem } from '../../../types/template.types';

const TEMPLATE_TYPES = [
  { value: 'artigo', label: 'Artigo Completo' },
  { value: 'resumo', label: 'Resumo Expandido' },
  { value: 'periodico', label: 'Periódico / Journal' },
  { value: 'poster', label: 'Pôster Científico' },
];

export const TemplatesTab: React.FC = () => {
  const dispatch = useDispatch();
  const { data: templates = [], isLoading, isError, refetch } = useTemplatesQuery();
  const uploadMutation = useUploadTemplateMutation();
  const deleteMutation = useDeleteTemplateMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [publisher, setPublisher] = useState('');
  const [templateType, setTemplateType] = useState('artigo');
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Download do ZIP original
  const handleDownload = useCallback(
    async (templateId: string) => {
      try {
        const { downloadUrl } = await templatesService.getTemplateDownloadUrl(templateId);
        window.open(downloadUrl, '_blank');
      } catch (err: unknown) {
        const error = err as Error;
        dispatch(
          showNotification({
            message: error.message || 'Falha ao baixar arquivo ZIP do template.',
            severity: 'error',
          })
        );
      }
    },
    [dispatch]
  );

  // Exclusão de template
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      dispatch(
        showNotification({
          message: `Template "${deleteConfirmId}" excluído com sucesso.`,
          severity: 'success',
        })
      );
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      const error = err as Error;
      dispatch(
        showNotification({
          message: error.message || 'Erro ao excluir template.',
          severity: 'error',
        })
      );
    }
  };

  // Submissão do formulário de novo template
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      dispatch(
        showNotification({
          message: 'Por favor, selecione um arquivo compactado (.zip).',
          severity: 'warning',
        })
      );
      return;
    }
    if (!publisher.trim() || !templateType.trim()) {
      dispatch(
        showNotification({
          message: 'Editora e tipo de documento são campos obrigatórios.',
          severity: 'warning',
        })
      );
      return;
    }
    if (!templateName.trim()) {
      dispatch(
        showNotification({
          message: 'O nome de exibição do template é obrigatório.',
          severity: 'warning',
        })
      );
      return;
    }

    try {
      const created = await uploadMutation.mutateAsync({
        file: selectedFile,
        publisher: publisher.trim(),
        templateType: templateType.trim(),
        name: templateName.trim(),
        description: description.trim() || undefined,
      });

      dispatch(
        showNotification({
          message: `Template "${created.id}" homologado e salvo com sucesso no catálogo institucional!`,
          severity: 'success',
        })
      );
      setModalOpen(false);
      setSelectedFile(null);
      setPublisher('');
      setTemplateType('artigo');
      setTemplateName('');
      setDescription('');
    } catch (err: unknown) {
      const error = err as Error;
      dispatch(
        showNotification({
          message: error.message || 'Erro ao fazer upload do template.',
          severity: 'error',
        })
      );
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates;
    const lower = searchTerm.toLowerCase();
    return templates.filter(
      (t) =>
        t.id.toLowerCase().includes(lower) ||
        t.name.toLowerCase().includes(lower) ||
        t.publisher.toLowerCase().includes(lower) ||
        t.templateType.toLowerCase().includes(lower) ||
        t.mainEntryPath.toLowerCase().includes(lower)
    );
  }, [templates, searchTerm]);

  const columns: GridColDef<LatexTemplateItem>[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'Slug Canônico',
        minWidth: 150,
        flex: 1,
        renderCell: (params: GridRenderCellParams<LatexTemplateItem>) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileCode size={16} color="#2563eb" />
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'name',
        headerName: 'Nome do Template',
        minWidth: 220,
        flex: 1.5,
        renderCell: (params: GridRenderCellParams<LatexTemplateItem>) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Arquivo: <code>{params.row.originalFileName}</code>
            </Typography>
          </Box>
        ),
      },
      {
        field: 'publisher',
        headerName: 'Editora',
        width: 130,
        renderCell: (params: GridRenderCellParams<LatexTemplateItem>) => (
          <Chip
            label={params.value}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          />
        ),
      },
      {
        field: 'templateType',
        headerName: 'Tipo',
        width: 140,
        renderCell: (params: GridRenderCellParams<LatexTemplateItem>) => (
          <Chip
            label={params.value}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize', fontSize: '0.72rem' }}
          />
        ),
      },
      {
        field: 'mainEntryPath',
        headerName: 'Arquivo TeX Raiz',
        width: 170,
        renderCell: (params: GridRenderCellParams<LatexTemplateItem>) => (
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              bgcolor: 'action.hover',
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'projects',
        headerName: 'Artigos',
        width: 90,
        renderCell: (params: GridRenderCellParams<LatexTemplateItem>) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row._count?.projects ?? 0}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Ações',
        width: 110,
        sortable: false,
        renderCell: (params: GridRenderCellParams<LatexTemplateItem>) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Baixar pacote ZIP original">
              <IconButton size="small" onClick={() => handleDownload(params.row.id)}>
                <Download size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Excluir template">
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteConfirmId(params.row.id)}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [handleDownload]
  );

  return (
    <Stack spacing={2.5} sx={{ height: '100%' }}>
      {/* Barra de Ações Superior */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Templates LaTeX Homologados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Catálogo institucional centralizado no MinIO. Apenas administradores podem cadastrar ou
            sobrescrever templates.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Buscar por slug, editora ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.6 }} />,
              },
            }}
            sx={{ width: { xs: '100%', sm: 280 } }}
          />

          <Button
            variant="outlined"
            size="small"
            onClick={() => refetch()}
            disabled={isLoading}
            sx={{ minWidth: 'auto', px: 1.5, height: 40 }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : undefined} />
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={16} />}
            onClick={() => setModalOpen(true)}
            sx={{ fontWeight: 700, textTransform: 'none', height: 40, px: 2 }}
          >
            Novo Template
          </Button>
        </Stack>
      </Stack>

      {/* Grid Principal de Dados */}
      {isError ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error">
            Erro ao carregar lista de templates LaTeX do catálogo.
          </Typography>
        </Paper>
      ) : (
        <GenericDataGrid<LatexTemplateItem>
          rows={filteredTemplates}
          columns={columns}
          loading={isLoading}
          height="calc(100vh - 220px)"
          emptyMessage="Nenhum template LaTeX cadastrado no catálogo."
        />
      )}

      {/* Modal de Cadastro Administrativo */}
      <StandardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Cadastrar / Sobrescrever Template LaTeX"
        subtitle="Envie o arquivo .zip fornecido pela sociedade científica. O sistema detectará automaticamente o arquivo TeX raiz e salvará no MinIO."
        icon={<FileUp size={22} color="#2563eb" />}
        size="md"
        onConfirm={handleUploadSubmit}
        confirmText={uploadMutation.isPending ? 'Salvando no MinIO...' : 'Salvar no Catálogo'}
        confirmDisabled={
          !selectedFile ||
          !publisher.trim() ||
          !templateType.trim() ||
          !templateName.trim() ||
          uploadMutation.isPending
        }
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
            <strong>Política de Sobrescrita:</strong> Slugs no padrão <code>[editora]-[tipo]</code>{' '}
            são determinísticos. Se o template já existir, ele será atualizado no MinIO e banco sem
            alterar o histórico dos artigos existentes.
          </Alert>

          <Stack direction="row" spacing={2}>
            <TextField
              required
              fullWidth
              size="small"
              label="Editora / Sociedade / Evento"
              placeholder="Ex: IEEE, SBC, ACM, Elsevier, Springer, SBPC"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              helperText="Campo aberto: informe qualquer editora ou evento acadêmico."
              sx={{ flex: 1 }}
            />

            <FormControl size="small" sx={{ width: 220 }} required>
              <InputLabel id="template-type-label">Tipo de Documento</InputLabel>
              <Select
                labelId="template-type-label"
                value={templateType}
                label="Tipo de Documento"
                onChange={(e) => setTemplateType(e.target.value)}
              >
                {TEMPLATE_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            fullWidth
            required
            size="small"
            label="Nome de Exibição do Template"
            placeholder="Ex: IEEE Conference Paper, SBC Artigo Regular"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            helperText="Nome amigável exibido aos autores na seleção de templates."
          />

          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            label="Descrição / Diretrizes de Submissão (Opcional)"
            placeholder="Ex: Template de 2 colunas para artigos regulares de até 10 páginas."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Área de Seleção de Arquivo ZIP */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              borderStyle: 'dashed',
              borderColor: selectedFile ? 'primary.main' : 'divider',
              bgcolor: selectedFile ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
            }}
          >
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              id="admin-template-file-input"
              hidden
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />
            <label
              htmlFor="admin-template-file-input"
              style={{ cursor: 'pointer', display: 'block' }}
            >
              <FileUp size={36} color="#2563eb" style={{ margin: '0 auto 8px' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {selectedFile
                  ? selectedFile.name
                  : 'Clique para selecionar o arquivo .zip do template'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB selecionado`
                  : 'Suporta pacotes oficiais contendo .tex, .cls, .sty, .bib e imagens'}
              </Typography>
            </label>
          </Paper>
        </Stack>
      </StandardModal>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Confirmar Exclusão de Template?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza de que deseja excluir o template <strong>{deleteConfirmId}</strong> do
            catálogo institucional? Esta ação removerá o pacote do MinIO permanentemente.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Definitivamente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
