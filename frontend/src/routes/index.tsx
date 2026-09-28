import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoginPage } from "../features/auth/LoginPage";
import { NotFoundPage } from "../features/common/NotFoundPage";
import { CoordinatorDashboardPage } from "../features/coordinator/CoordinatorDashboardPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import {
  AcademicPeriodsView,
  InstitutionalProjectsView,
  ManagerOverviewView,
  TeamsManagementView,
} from "../features/manager/ManagerDashboardPage";
import { ReviewDetailPage } from "../features/reviewer/ReviewDetailPage";
import { ReviewsListPage } from "../features/reviewer/ReviewsListPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";
import { RoleLayoutResolver } from "../layouts/RoleLayoutResolver";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas Protegidas envolvidas pelo Resolvedor de Layout por Perfil */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleLayoutResolver />}>
          {/* Rota do Dashboard Principal com Rotas Filhas para Navegação Declarativa */}
          <Route path="/" element={<DashboardPage />}>
            <Route index element={<ManagerOverviewView />} />
            <Route path="academic-periods" element={<AcademicPeriodsView />} />
            <Route path="articles" element={<InstitutionalProjectsView />} />
            <Route path="teams" element={<TeamsManagementView />} />
            <Route path="manager" element={<ManagerOverviewView />} />
            <Route path="manager/academic-periods" element={<AcademicPeriodsView />} />
            <Route path="manager/articles" element={<InstitutionalProjectsView />} />
            <Route path="manager/teams" element={<TeamsManagementView />} />
          </Route>

          {/* Rotas de Workspace, Revisões e Coordenação */}
          <Route path="/workspace/:projectId" element={<WorkspacePage />} />
          <Route
            path="/workspace/:projectId/task/:taskId"
            element={<WorkspacePage />}
          />
          <Route path="/reviews" element={<ReviewsListPage />} />
          <Route path="/reviews/:prId" element={<ReviewDetailPage />} />
          <Route path="/coordinator" element={<CoordinatorDashboardPage />} />
        </Route>
      </Route>

      {/* Rota 404 - Página Não Encontrada Global */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

