import React from "react";
import { useSelector } from "react-redux";
import { Role } from "../constants/roles";
import type { RootState } from "../store";
import { AuthorLayout } from "./AuthorLayout";
import { CoordinatorLayout } from "./CoordinatorLayout";
import { ManagerLayout } from "./ManagerLayout";
import { ReviewerLayout } from "./ReviewerLayout";

export const RoleLayoutResolver: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);

  switch (user?.role) {
    case Role.AUTHOR:
      return <AuthorLayout>{children}</AuthorLayout>;
    case Role.REVIEWER:
      return <ReviewerLayout>{children}</ReviewerLayout>;
    case Role.COORDINATOR:
      return <CoordinatorLayout>{children}</CoordinatorLayout>;
    case Role.MANAGER:
    case Role.ADMIN:
      return <ManagerLayout>{children}</ManagerLayout>;
    default:
      return <AuthorLayout>{children}</AuthorLayout>;
  }
};
