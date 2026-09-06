import React from "react";
import { useSelector } from "react-redux";
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
    case "AUTHOR":
      return <AuthorLayout>{children}</AuthorLayout>;
    case "REVIEWER":
      return <ReviewerLayout>{children}</ReviewerLayout>;
    case "COORDINATOR":
      return <CoordinatorLayout>{children}</CoordinatorLayout>;
    case "MANAGER":
    case "ADMIN":
      return <ManagerLayout>{children}</ManagerLayout>;
    default:
      return <AuthorLayout>{children}</AuthorLayout>;
  }
};
