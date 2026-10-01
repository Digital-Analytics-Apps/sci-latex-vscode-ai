import AddIcon from "@mui/icons-material/Add";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import React from "react";
import {
  createBoldColumn,
  createChipColumn,
  createDateColumn,
} from "../../../components/common/dataGridColumns";
import type { ProjectListItem } from "../../../types/project.types";

interface InstitutionalProjectsSectionProps {
  allProjects: ProjectListItem[];
  isLoadingProjects: boolean;
  onOpenCreateProject: () => void;
}

function getSubmissionStatusColor(
  status: string,
): "success" | "info" | "warning" | "default" {
  if (status === "COMPLETED_PUBLISHED") return "success";
  if (status.includes("SUBMITTED")) return "info";
  return "warning";
}

export const InstitutionalProjectsSection = ({
  allProjects,
  isLoadingProjects,
  onOpenCreateProject,
}: InstitutionalProjectsSectionProps) => {
  // Linhas para DataGrid 2: Listagem Global de Artigos Institucionais
  const projectRows = React.useMemo(() => {
    if (!allProjects) return [];
    return allProjects.map((p) => ({
      id: p.id,
      name: p.name,
      teamName: p.team?.name || "Sem Equipe",
      submissionStatus: p.submissionStatus || "DRAFT",
      targetConference: p.targetConferenceName || "Não definida",
      targetDate: p.targetConferenceDate || null,
    }));
  }, [allProjects]);

  // Colunas DataGrid 2: Artigos Institucionais
  const projectColumns = React.useMemo<GridColDef[]>(
    () => [
      createBoldColumn({
        field: "name",
        headerName: "Título do Artigo Científico",
        flex: 1.8,
        minWidth: 260,
      }),
      {
        field: "teamName",
        headerName: "Equipe",
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: "targetConference",
        headerName: "Congresso Alvo",
        flex: 1.2,
        minWidth: 160,
      },
      createChipColumn(
        {
          field: "submissionStatus",
          headerName: "Status de Governança",
          flex: 1.3,
          minWidth: 180,
        },
        (params) => ({
          label: String(params.value || ""),
          color: getSubmissionStatusColor(String(params.value || "")),
        }),
      ),
      createDateColumn({
        field: "targetDate",
        headerName: "Data Limite Alvo",
        flex: 1,
        minWidth: 140,
      }),
    ],
    [],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Artigos Científicos Institucionais
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visão abrangente de todos os artigos em andamento e submetidos.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={onOpenCreateProject}
        >
          Novo Artigo
        </Button>
      </Box>

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, bgcolor: "background.paper" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Listagem Geral de Artigos Institucionais
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Artigos científicos e status de aprovação de governança.
            </Typography>
          </Box>

          <Box sx={{ height: 480, width: "100%" }}>
            <DataGrid
              rows={projectRows}
              columns={projectColumns}
              loading={isLoadingProjects}
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
              disableRowSelectionOnClick
              sx={{ border: "none" }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
