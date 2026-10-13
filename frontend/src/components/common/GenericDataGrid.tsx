import { Box, Card, CardContent, Typography } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridValidRowModel,
} from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React from "react";

export interface GenericDataGridProps<TData extends GridValidRowModel> {
  rows: TData[];
  columns: GridColDef<TData>[];
  getRowId?: (row: TData) => string | number;
  loading?: boolean;
  totalCount?: number;
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  pageSizeOptions?: number[];
  width?: number | string;
  height?: number | string;
  emptyMessage?: string;
  rowHeight?: number;
  /** Título opcional exibido no cabeçalho do Card integrado */
  title?: string;
  /** Conteúdo de busca, filtros e ações integrado no cabeçalho do Card */
  headerToolbarContent?: React.ReactNode;
  /** Força o envolvimento da DataGrid em um Card (padrão true se headerToolbarContent ou title for passado) */
  cardWrapper?: boolean;
}

export function GenericDataGrid<TData extends GridValidRowModel>({
  rows,
  columns,
  getRowId = (row) => row.id,
  loading = false,
  totalCount,
  paginationModel,
  onPaginationModelChange,
  pageSizeOptions = [5, 10, 25, 50],
  width = "100%",
  height = 480,
  emptyMessage = "Nenhum registro encontrado.",
  rowHeight = 56,
  title,
  headerToolbarContent,
  cardWrapper,
}: Readonly<GenericDataGridProps<TData>>) {
  const isServerPagination = totalCount !== undefined;
  const shouldWrapInCard =
    cardWrapper ?? Boolean(title || headerToolbarContent);

  const dataGridNode = (
    <DataGrid<TData>
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      loading={loading}
      rowCount={isServerPagination ? totalCount : undefined}
      paginationMode={isServerPagination ? "server" : "client"}
      paginationModel={paginationModel}
      onPaginationModelChange={onPaginationModelChange}
      pageSizeOptions={pageSizeOptions}
      rowHeight={rowHeight}
      disableRowSelectionOnClick
      localeText={{
        ...ptBR?.components?.MuiDataGrid?.defaultProps?.localeText,
        noRowsLabel: emptyMessage,
      }}
      sx={{
        border: "none",
        width: "100%",
        height: "100%",
        px: 2,
        "& .MuiDataGrid-columnHeaders": {
          bgcolor: "action.hover",
          fontWeight: 700,
        },
        "& .MuiDataGrid-cell": {
          display: "flex",
          alignItems: "center",
        },
      }}
      slots={{
        noRowsOverlay: () => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography color="text.secondary" variant="body2">
              {emptyMessage}
            </Typography>
          </Box>
        ),
      }}
    />
  );

  if (shouldWrapInCard) {
    return (
      <Card
        variant="outlined"
        sx={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {(title || headerToolbarContent) && (
          <Box
            sx={{
              bgcolor: "background.paper",
              borderBottom: "1px solid",
              borderColor: "divider",
              flex: "0 0 auto",
            }}
          >
            {title && (
              <Typography variant="h6" sx={{ p: 2, pb: 1, fontWeight: 700 }}>
                {title}
              </Typography>
            )}
            {headerToolbarContent}
          </Box>
        )}
        <CardContent
          sx={{
            p: 0,
            flex: 1,
            minHeight: 0,
            width: "100%",
            "&:last-child": { pb: 0 },
          }}
        >
          {dataGridNode}
        </CardContent>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        width,
        height,
        position: "relative",
      }}
    >
      {dataGridNode}
    </Box>
  );
}
