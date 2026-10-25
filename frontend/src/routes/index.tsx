import { Route, Routes } from "react-router-dom";
import { NotFoundPage } from "../components/common/NotFoundPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoginPage } from "../features/auth/LoginPage";
import { ArticleDetailPage } from "../features/author/ArticleDetailPage";
import { AuthorArticlesPage } from "../features/author/AuthorArticlesPage";
import { CoordinatorDashboardPage } from "../features/coordinator/CoordinatorDashboardPage";
import {
  AcademicPeriodsView,
  InstitutionalProjectsView,
  ManagerDashboardPage,
  ManagerOverviewView,
} from "../features/manager/ManagerDashboardPage";
import { EditorPage } from "../features/editor/pages/EditorPage";
import { RoleLayoutResolver } from "../layouts/RoleLayoutResolver";
import { PersonaRootResolver } from "./PersonaRootResolver";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas Protegidas envolvidas pelo Resolvedor de Layout por Perfil */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleLayoutResolver />}>
          {/* Rota Raiz resolvedora de persona */}
          <Route path="/" element={<PersonaRootResolver />}>
            <Route index element={<PersonaRootResolver />} />
            <Route path="academic-periods" element={<AcademicPeriodsView />} />
            <Route path="articles" element={<InstitutionalProjectsView />} />
            <Route path="manager" element={<ManagerOverviewView />} />
            <Route
              path="manager/academic-periods"
              element={<AcademicPeriodsView />}
            />
            <Route
              path="manager/articles"
              element={<InstitutionalProjectsView />}
            />
          </Route>

          {/* Rotas por Persona */}
          <Route path="/articles" element={<AuthorArticlesPage />} />
          <Route path="/articles/:projectId" element={<ArticleDetailPage />} />
          <Route path="/coordinator" element={<CoordinatorDashboardPage />} />
          <Route path="/manager" element={<ManagerDashboardPage />} />
          <Route path="/workspace/:projectId" element={<EditorPage />} />
          <Route
            path="/workspace/:projectId/task/:taskId"
            element={<EditorPage />}
          />
        </Route>
      </Route>

      {/* Rota 404 - Página Não Encontrada Global */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
