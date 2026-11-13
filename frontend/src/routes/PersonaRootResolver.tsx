import { useSelector } from "react-redux";
import { Role } from "../constants/roles";
import { AdminCenterPage } from "../features/admin/AdminCenterPage";
import { AuthorArticlesPage } from "../features/author/AuthorArticlesPage";
import { CoordinatorDashboardPage } from "../features/coordinator/CoordinatorDashboardPage";
import { ManagerDashboardPage } from "../features/manager/ManagerDashboardPage";
import type { RootState } from "../store";

export const PersonaRootResolver = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  switch (user?.role) {
    case Role.AUTHOR:
      return <AuthorArticlesPage />;
    case Role.COORDINATOR:
      return <CoordinatorDashboardPage />;
    case Role.MANAGER:
      return <ManagerDashboardPage />;
    case Role.ADMIN:
      return <AdminCenterPage />;
    default:
      return <AuthorArticlesPage />;
  }
};
