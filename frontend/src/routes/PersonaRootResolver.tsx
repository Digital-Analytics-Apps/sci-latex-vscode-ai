import { useSelector } from "react-redux";
import { Role } from "../constants/roles";
import { AuthorArticlesPage } from "../features/author/AuthorArticlesPage";
import { CoordinatorDashboardPage } from "../features/coordinator/CoordinatorDashboardPage";
import { ManagerDashboardPage } from "../features/manager/ManagerDashboardPage";
import { ReviewsListPage } from "../features/reviewer/ReviewsListPage";
import type { RootState } from "../store";

export const PersonaRootResolver = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  switch (user?.role) {
    case Role.AUTHOR:
      return <AuthorArticlesPage />;
    case Role.REVIEWER:
      return <ReviewsListPage />;
    case Role.COORDINATOR:
      return <CoordinatorDashboardPage />;
    case Role.MANAGER:
    case Role.ADMIN:
      return <ManagerDashboardPage />;
    default:
      return <AuthorArticlesPage />;
  }
};
