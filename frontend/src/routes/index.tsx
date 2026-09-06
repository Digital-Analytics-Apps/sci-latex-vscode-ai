import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ReviewDetailPage } from "../features/reviewer/ReviewDetailPage";
import { ReviewsListPage } from "../features/reviewer/ReviewsListPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";
import { RoleLayoutResolver } from "../layouts/RoleLayoutResolver";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas Protegidas com Layout Adaptativo por Perfil */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <RoleLayoutResolver>
              <DashboardPage />
            </RoleLayoutResolver>
          }
        />
        <Route
          path="/workspace/:projectId"
          element={
            <RoleLayoutResolver>
              <WorkspacePage />
            </RoleLayoutResolver>
          }
        />
        <Route
          path="/reviews"
          element={
            <RoleLayoutResolver>
              <ReviewsListPage />
            </RoleLayoutResolver>
          }
        />
        <Route
          path="/reviews/:prId"
          element={
            <RoleLayoutResolver>
              <ReviewDetailPage />
            </RoleLayoutResolver>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
