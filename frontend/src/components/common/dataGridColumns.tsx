import { Chip, Typography } from "@mui/material";
import type {
  GridColDef,
  GridRenderCellParams,
  GridValidRowModel,
} from "@mui/x-data-grid";

/**
 * Utilitários e helpers de fábrica para definição padronizada de colunas do MUI DataGrid.
 * Evita repetição de código JSX e alinha os elementos visuais com o Design System.
 */

/**
 * Cria uma coluna com texto em negrito (ex: Nomes de Equipes, Títulos de Artigos).
 */
export function createBoldColumn<TRow extends GridValidRowModel = any>(
  config: GridColDef<TRow>,
): GridColDef<TRow> {
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
 * Interface para as propriedades customizáveis de um Chip em colunas DataGrid.
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
export function createChipColumn<TRow extends GridValidRowModel = any>(
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
export function createDateColumn<TRow extends GridValidRowModel = any>(
  config: GridColDef<TRow>,
): GridColDef<TRow> {
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
