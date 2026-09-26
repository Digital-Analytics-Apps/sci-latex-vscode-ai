import { Box, Typography } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridValidRowModel,
} from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";

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
}: Readonly<GenericDataGridProps<TData>>) {
  const isServerPagination = totalCount !== undefined;

  return (
    <Box
      sx={{
        width,
        height,
        position: "relative",
      }}
    >
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
    </Box>
  );
}
