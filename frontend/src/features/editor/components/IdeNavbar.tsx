import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  Check,
  ChevronDown,
  Clock,
  Code,
  Columns,
  FileOutput,
  History,
  MessageSquare,
  WifiOff,
} from 'lucide-react';
import { type MouseEvent, useState } from 'react';
import { Collaborator, RemoteCursor, SaveStatus } from '../types/collab.types';
import { CollaboratorsBar } from './CollaboratorsBar';
import { EditorHistoryControls } from './EditorHistoryControls';
export interface IdeNavbarProps {
  projectTitle: string;
  userId: string;
  collaborators: Collaborator[];
  remoteCursors?: Map<string, RemoteCursor>;
  activeFile?: string;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  layoutMode: 'split' | 'editor' | 'pdf';
  showHistory: boolean;
  snapshotsCount: number;
  showReview?: boolean;
  onToggleReview?: () => void;
  commentsCount?: number;
  isConnected?: boolean;
  isOnline?: boolean;
  isReviewer?: boolean;
  onLayoutChange: (mode: 'split' | 'editor' | 'pdf') => void;
  onToggleHistory: () => void;
  onManualFlush: () => void;
  onRecompile?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoCount?: number;
  redoCount?: number;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function IdeNavbar({
  projectTitle,
  userId,
  collaborators,
  remoteCursors,
  activeFile,
  saveStatus,
  lastSavedAt,
  layoutMode,
  showHistory,
  snapshotsCount,
  showReview = false,
  onToggleReview,
  commentsCount = 0,
  isConnected = true,
  isOnline = true,
  isReviewer = false,
  onLayoutChange,
  onToggleHistory,
  onManualFlush,
  onRecompile,
  canUndo = false,
  canRedo = false,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
}: Readonly<IdeNavbarProps>) {
  // Estados dos menus dropdown
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null);
  const [editMenuAnchor, setEditMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null);
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);

  const handleOpenMenu = (
    setter: (el: HTMLElement | null) => void,
    event: MouseEvent<HTMLElement>
  ) => {
    setter(event.currentTarget);
  };

  const handleCloseMenu = (setter: (el: null) => void) => {
    setter(null);
  };

  return (
    <Box
      component="nav"
      className="ide-redesign-toolbar"
      sx={{
        height: 40,
        minHeight: 40,
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        userSelect: 'none',
        zIndex: 30,
      }}
    >
      {/* Lado Esquerdo: Logo Overleaf + Menubar (File, Edit, View) */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {/* Overleaf Leaf Brand Logo */}
        <Tooltip
          title={
            isConnected
              ? 'SCI-LaTeX Studio • Conectado via WebSocket'
              : 'SCI-LaTeX Studio • Modo Offline (Alterações salvas localmente no navegador)'
          }
          arrow
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              pr: 0.5,
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 50C10 27.9086 27.9086 10 50 10C72.0914 10 90 27.9086 90 50C90 72.0914 72.0914 90 50 90C27.9086 90 10 72.0914 10 50Z"
                fill="var(--mui-palette-primary-main)"
              />
              <path
                d="M32 68C32 68 44 65 52 53C60 41 68 28 68 28C68 28 54 36 44 46C34 56 32 68 32 68Z"
                fill="#ffffff"
              />
            </svg>
            <Box
              component="span"
              sx={{
                position: 'absolute',
                bottom: -2,
                right: 3,
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#10b981' : '#ef4444',
                border: '1.5px solid',
                borderColor: 'background.paper',
              }}
            />
          </Box>
        </Tooltip>

        {/* Desktop Menubar */}
        <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center' }}>
          <Button
            size="small"
            variant="text"
            onClick={(e) => handleOpenMenu(setFileMenuAnchor, e)}
            sx={{
              fontSize: '0.75rem',
              height: 26,
              px: 0.8,
              minWidth: 'auto',
              textTransform: 'none',
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                backgroundColor: 'action.hover',
              },
            }}
          >
            File
          </Button>
          <Menu
            anchorEl={fileMenuAnchor}
            open={Boolean(fileMenuAnchor)}
            onClose={() => handleCloseMenu(setFileMenuAnchor)}
            sx={{ '& .MuiPaper-root': { fontSize: '0.8rem', minWidth: 180 } }}
          >
            <MenuItem
              onClick={() => {
                onManualFlush();
                handleCloseMenu(setFileMenuAnchor);
              }}
            >
              Salvar Snapshot (Flush)
            </MenuItem>
            {onRecompile && (
              <MenuItem
                disabled={!isOnline}
                onClick={() => {
                  if (isOnline) {
                    onRecompile();
                    handleCloseMenu(setFileMenuAnchor);
                  }
                }}
              >
                Recompilar PDF (Ctrl+Enter)
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={() => handleCloseMenu(setFileMenuAnchor)}>Download PDF</MenuItem>
            <MenuItem onClick={() => handleCloseMenu(setFileMenuAnchor)}>
              Exportar Source (.zip)
            </MenuItem>
          </Menu>

          <Button
            size="small"
            variant="text"
            onClick={(e) => handleOpenMenu(setEditMenuAnchor, e)}
            sx={{
              fontSize: '0.75rem',
              height: 26,
              px: 0.8,
              minWidth: 'auto',
              textTransform: 'none',
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                backgroundColor: 'action.hover',
              },
            }}
          >
            Edit
          </Button>
          <Menu
            anchorEl={editMenuAnchor}
            open={Boolean(editMenuAnchor)}
            onClose={() => handleCloseMenu(setEditMenuAnchor)}
            sx={{ '& .MuiPaper-root': { fontSize: '0.8rem', minWidth: 160 } }}
          >
            <MenuItem
              disabled={!canUndo}
              onClick={() => {
                onUndo?.();
                handleCloseMenu(setEditMenuAnchor);
              }}
            >
              Desfazer (Ctrl+Z)
            </MenuItem>
            <MenuItem
              disabled={!canRedo}
              onClick={() => {
                onRedo?.();
                handleCloseMenu(setEditMenuAnchor);
              }}
            >
              Refazer (Ctrl+Y)
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => handleCloseMenu(setEditMenuAnchor)}>
              Localizar (Ctrl+F)
            </MenuItem>
          </Menu>

          <Button
            size="small"
            variant="text"
            onClick={(e) => handleOpenMenu(setViewMenuAnchor, e)}
            sx={{
              fontSize: '0.75rem',
              height: 26,
              px: 0.8,
              minWidth: 'auto',
              textTransform: 'none',
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                backgroundColor: 'action.hover',
              },
            }}
          >
            View
          </Button>
          <Menu
            anchorEl={viewMenuAnchor}
            open={Boolean(viewMenuAnchor)}
            onClose={() => handleCloseMenu(setViewMenuAnchor)}
            sx={{ '& .MuiPaper-root': { fontSize: '0.8rem', minWidth: 160 } }}
          >
            <MenuItem
              onClick={() => {
                onLayoutChange('split');
                handleCloseMenu(setViewMenuAnchor);
              }}
            >
              Split Screen (Editor + PDF)
            </MenuItem>
            <MenuItem
              onClick={() => {
                onLayoutChange('editor');
                handleCloseMenu(setViewMenuAnchor);
              }}
            >
              Apenas Editor
            </MenuItem>
            <MenuItem
              onClick={() => {
                onLayoutChange('pdf');
                handleCloseMenu(setViewMenuAnchor);
              }}
            >
              Apenas PDF
            </MenuItem>
          </Menu>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, height: 16, alignSelf: 'center' }}
          />
          <EditorHistoryControls
            canUndo={canUndo}
            canRedo={canRedo}
            undoCount={undoCount}
            redoCount={redoCount}
            onUndo={onUndo || (() => {})}
            onRedo={onRedo || (() => {})}
          />
        </Stack>
      </Stack>

      {/* Centro: Título do Projeto & Dropdown de Opções */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Button
          size="small"
          variant="text"
          onClick={(e) => handleOpenMenu(setProjectMenuAnchor, e)}
          endIcon={<ChevronDown size={14} />}
          sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'none',
            color: 'text.primary',
            maxWidth: 320,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            px: 1,
            height: 28,
          }}
        >
          {projectTitle}
        </Button>

        <Menu
          anchorEl={projectMenuAnchor}
          open={Boolean(projectMenuAnchor)}
          onClose={() => handleCloseMenu(setProjectMenuAnchor)}
          sx={{ '& .MuiPaper-root': { fontSize: '0.8rem', minWidth: 220 } }}
        >
          <MenuItem onClick={() => handleCloseMenu(setProjectMenuAnchor)}>Baixar como PDF</MenuItem>
          <MenuItem onClick={() => handleCloseMenu(setProjectMenuAnchor)}>
            Baixar código fonte (.zip)
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleCloseMenu(setProjectMenuAnchor)}>
            Contagem de palavras
          </MenuItem>
          <MenuItem onClick={() => handleCloseMenu(setProjectMenuAnchor)}>
            Renomear projeto
          </MenuItem>
        </Menu>

        {/* Indicador de Salvamento Real-time */}
        <Tooltip
          title={
            !isConnected || saveStatus === 'offline'
              ? 'Desconectado da rede. O editor está operando em modo offline e salvando cada tecla no IndexedDB local.'
              : lastSavedAt
                ? `Última sincronização com PostgreSQL: ${lastSavedAt}`
                : 'Sincronizado via WebSocket'
          }
          arrow
        >
          <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', cursor: 'default' }}>
            {(!isConnected || saveStatus === 'offline') && (
              <>
                <WifiOff size={12} style={{ color: '#ef4444' }} />
                <Typography
                  component="span"
                  sx={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}
                >
                  Offline
                </Typography>
              </>
            )}
            {isConnected && saveStatus === 'saving' && (
              <>
                <Clock size={12} style={{ color: '#f59e0b' }} />
                <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  Salvando...
                </Typography>
              </>
            )}
            {isConnected && saveStatus === 'synced' && (
              <>
                <Check size={12} style={{ color: 'var(--mui-palette-primary-main)' }} />
                <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  Salvo
                </Typography>
              </>
            )}
            {isConnected && saveStatus === 'pending_debounce' && (
              <>
                <Clock size={12} style={{ color: '#f59e0b' }} />
                <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  Aguardando debounce...
                </Typography>
              </>
            )}
          </Stack>
        </Tooltip>
      </Stack>

      {/* Lado Direito: Layout Switcher, History, Nickname, Collaborators e Botão Share */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {/* Alternador de Layout Visual (Split, Editor, PDF) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'action.hover',
            p: 0.25,
            borderRadius: 1,
            gap: 0.25,
          }}
        >
          <Tooltip title="Visualização Dividida (Editor + PDF)" arrow>
            <IconButton
              size="small"
              onClick={() => onLayoutChange('split')}
              sx={{
                width: 24,
                height: 24,
                borderRadius: 0.5,
                backgroundColor: layoutMode === 'split' ? 'background.paper' : 'transparent',
                color: layoutMode === 'split' ? 'primary.main' : 'text.secondary',
                boxShadow: layoutMode === 'split' ? 1 : 0,
              }}
            >
              <Columns size={13} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Apenas Editor" arrow>
            <IconButton
              size="small"
              onClick={() => onLayoutChange('editor')}
              sx={{
                width: 24,
                height: 24,
                borderRadius: 0.5,
                backgroundColor: layoutMode === 'editor' ? 'background.paper' : 'transparent',
                color: layoutMode === 'editor' ? 'primary.main' : 'text.secondary',
                boxShadow: layoutMode === 'editor' ? 1 : 0,
              }}
            >
              <Code size={13} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Apenas PDF" arrow>
            <IconButton
              size="small"
              onClick={() => onLayoutChange('pdf')}
              sx={{
                width: 24,
                height: 24,
                borderRadius: 0.5,
                backgroundColor: layoutMode === 'pdf' ? 'background.paper' : 'transparent',
                color: layoutMode === 'pdf' ? 'primary.main' : 'text.secondary',
                boxShadow: layoutMode === 'pdf' ? 1 : 0,
              }}
            >
              <FileOutput size={13} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Botão de Histórico */}
        <Tooltip title="Histórico de alterações e Snapshots" arrow>
          <Button
            size="small"
            variant={showHistory ? 'outlined' : 'text'}
            onClick={onToggleHistory}
            startIcon={<History size={13} />}
            sx={{
              fontSize: '0.74rem',
              height: 26,
              px: 0.8,
              textTransform: 'none',
              color: showHistory ? 'primary.main' : 'text.secondary',
              borderColor: 'divider',
            }}
          >
            Histórico ({snapshotsCount})
          </Button>
        </Tooltip>

        {/* Botão de Review (Estilo Overleaf) */}
        <Tooltip title="Painel de Review e Comentários" arrow>
          <Button
            size="small"
            variant={showReview ? 'contained' : 'text'}
            onClick={onToggleReview}
            startIcon={<MessageSquare size={13} />}
            sx={{
              fontSize: '0.74rem',
              height: 26,
              px: 0.8,
              textTransform: 'none',
              backgroundColor: showReview ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: showReview ? '#d97706' : 'text.secondary',
              borderColor: 'divider',
              fontWeight: showReview ? 700 : 500,
              '&:hover': {
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
              },
            }}
          >
            Review ({commentsCount || 0})
          </Button>
        </Tooltip>
        {isReviewer && (
          <Chip
            label="🔒 Modo Revisão (Leitura)"
            size="small"
            color="secondary"
            sx={{
              height: 24,
              fontSize: '0.68rem',
              fontWeight: 700,
              backgroundColor: 'rgba(123, 31, 162, 0.15)',
              color: '#9c27b0',
              borderColor: 'rgba(123, 31, 162, 0.3)',
            }}
            variant="outlined"
          />
        )}

        {/* Pilha de Avatares dos Colaboradores */}
        <CollaboratorsBar
          collaborators={collaborators}
          currentUserId={userId}
          remoteCursors={remoteCursors}
          activeFile={activeFile}
        />
      </Stack>
    </Box>
  );
}
