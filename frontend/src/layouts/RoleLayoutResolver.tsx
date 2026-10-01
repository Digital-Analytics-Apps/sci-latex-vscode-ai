import React from "react";
import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import { Role } from "../constants/roles";
import type { RootState } from "../store";
import { AuthorLayout } from "./AuthorLayout";
import { CoordinatorLayout } from "./CoordinatorLayout";
import { ManagerLayout } from "./ManagerLayout";
import { ReviewerLayout } from "./ReviewerLayout";

export const RoleLayoutResolver: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const content = children ?? <Outlet />;

  switch (user?.role) {
    case Role.AUTHOR:
      return <AuthorLayout>{content}</AuthorLayout>;
    case Role.REVIEWER:
      return <ReviewerLayout>{content}</ReviewerLayout>;
    case Role.COORDINATOR:
      return <CoordinatorLayout>{content}</CoordinatorLayout>;
    case Role.MANAGER:
    case Role.ADMIN:
      return <ManagerLayout>{content}</ManagerLayout>;
    default:
      return <AuthorLayout>{content}</AuthorLayout>;
  }
};
