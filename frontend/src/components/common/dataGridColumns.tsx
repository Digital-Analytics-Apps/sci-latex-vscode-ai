import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import type {
  GridColDef,
  GridRenderCellParams,
  GridValidRowModel,
} from "@mui/x-data-grid";
import type { ProjectMember } from "../../types/user.types";
import { UserAvatarStack } from "./UserAvatarStack";

/**
 * Utilitários e helpers de fábrica para definição padronizada de colunas do MUI DataGrid.
 * Evita repetição de código JSX e alinha os elementos visuais com o Design System.
 */

/**
 * Cria uma coluna com texto em negrito (ex: Nomes de Equipes, Títulos de Artigos).
 */
export function createBoldColumn<
  TRow extends GridValidRowModel = GridValidRowModel,
>(config: GridColDef<TRow>): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => (
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {params.value != null ? String(params.value) : "—"}
      </Typography>
    ),
  };
}

/**
 * Configuração para Chips em colunas DataGrid.
 */
export interface DataGridChipConfig {
  label: string;
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "info"
    | "success"
    | "warning"
    | "error";
  variant?: "outlined" | "filled";
}

/**
 * Cria uma coluna com renderização de Chip estilizado (ex: Status de submissão, Badges de contagem).
 */
export function createChipColumn<
  TRow extends GridValidRowModel = GridValidRowModel,
>(
  config: GridColDef<TRow>,
  getChipProps: (params: GridRenderCellParams<TRow>) => DataGridChipConfig,
): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const props = getChipProps(params);
      return <Chip size="small" sx={{ fontWeight: 600 }} {...props} />;
    },
  };
}

/**
 * Cria uma coluna de data formatada no padrão PT-BR.
 */
export function createDateColumn<
  TRow extends GridValidRowModel = GridValidRowModel,
>(config: GridColDef<TRow>): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      if (!params.value) {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      const formattedDate = new Date(String(params.value)).toLocaleDateString(
        "pt-BR",
      );
      return <Typography variant="body2">{formattedDate}</Typography>;
    },
  };
}

/**
 * Configuração para Colunas de Título e Subtítulo (com Ícone/Emoji opcional).
 */
export interface DataGridTitleSubtitleConfig {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

/**
 * Cria uma coluna com título principal em destaque, subtítulo opcional e ícone contextual.
 */
export function createTitleSubtitleColumn<
  TRow extends GridValidRowModel = GridValidRowModel,
>(
  config: GridColDef<TRow>,
  getProps: (params: GridRenderCellParams<TRow>) => DataGridTitleSubtitleConfig,
): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const { title, subtitle, icon } = getProps(params);
      return (
        <Box sx={{ py: 1, display: "flex", alignItems: "center", gap: 1 }}>
          {icon && (
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
              {typeof icon === "string" ? (
                <Typography variant="body2">{icon}</Typography>
              ) : (
                icon
              )}
            </Box>
          )}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, lineHeight: 1.3, color: "text.primary" }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontSize: "0.75rem" }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      );
    },
  };
}

/**
 * Configuração para Colunas de Progresso Linear.
 */
export interface DataGridProgressConfig {
  value: number;
  label?: string;
  color?: "primary" | "secondary" | "error" | "info" | "success" | "warning";
}

/**
 * Cria uma coluna com barra de progresso linear e badge percentual.
 */
export function createProgressColumn<
  TRow extends GridValidRowModel = GridValidRowModel,
>(
  config: GridColDef<TRow>,
  getProgressProps: (
    params: GridRenderCellParams<TRow>,
  ) => DataGridProgressConfig,
): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const {
        value,
        label = "Progresso",
        color = "primary",
      } = getProgressProps(params);
      return (
        <Box sx={{ width: "100%", pr: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {value}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={value}
            color={color}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>
      );
    },
  };
}

/**
 * Cria uma coluna com pilha sobreposta de Avatares a partir de um array de ProjectMember.
 */
export function createAvatarStackColumn<
  TRow extends GridValidRowModel = GridValidRowModel,
>(
  config: GridColDef<TRow>,
  getMembers: (params: GridRenderCellParams<TRow>) => ProjectMember[],
): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const members = getMembers(params) || [];
      if (members.length === 0) {
        return (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        );
      }
      return <UserAvatarStack members={members} avatarSize={28} />;
    },
  };
}

/**
 * Item de Ação para Coluna de Ações.
 */
export interface DataGridActionItem<
  TRow extends GridValidRowModel = GridValidRowModel,
> {
  label: string;
  onClick: (row: TRow, params: GridRenderCellParams<TRow>) => void;
  icon?: React.ReactNode;
  color?:
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning"
    | "inherit";
  variant?: "text" | "outlined" | "contained";
  disabled?: boolean | ((row: TRow) => boolean);
  show?: boolean | ((row: TRow) => boolean);
}

/**
 * Cria uma coluna de Ações personalizadas (alinhada à direita).
 * Aceita um array de ações direto, uma função que retorna um array de ações ou um ReactNode customizado.
 */
export function createActionsColumn<
  TRow extends GridValidRowModel = GridValidRowModel,
>(
  config: GridColDef<TRow>,
  actionsOrRender:
    | DataGridActionItem<TRow>[]
    | ((
        params: GridRenderCellParams<TRow>,
      ) => React.ReactNode | DataGridActionItem<TRow>[]),
): GridColDef<TRow> {
  return {
    sortable: false,
    filterable: false,
    align: "right",
    headerAlign: "right",
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const result =
        typeof actionsOrRender === "function"
          ? actionsOrRender(params)
          : actionsOrRender;
      if (Array.isArray(result)) {
        return (
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: "flex-end", alignItems: "center" }}
          >
            {result.map((action, idx) => {
              const isVisible =
                typeof action.show === "function"
                  ? action.show(params.row)
                  : action.show !== false;
              if (!isVisible) return null;

              const isDisabled =
                typeof action.disabled === "function"
                  ? action.disabled(params.row)
                  : !!action.disabled;

              return (
                <Button
                  key={`${action.label}-${idx}`}
                  size="small"
                  variant={action.variant || "contained"}
                  color={action.color || "primary"}
                  disabled={isDisabled}
                  endIcon={action.icon}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick(params.row, params);
                  }}
                  sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  {action.label}
                </Button>
              );
            })}
          </Stack>
        );
      }
      return result;
    },
  };
}
