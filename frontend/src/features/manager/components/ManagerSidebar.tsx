import ArticleIcon from "@mui/icons-material/Article";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import GroupsIcon from "@mui/icons-material/Groups";
import HomeIcon from "@mui/icons-material/Home";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

interface ManagerSidebarProps {
  height: number;
  width?: number;
}

export const ManagerSidebar = ({
  height,
  width = 250,
}: ManagerSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
  const isDashboard =
    pathname === "/" || pathname === "/manager" || pathname === "/manager/";
  const isAcademicPeriods =
    pathname === "/academic-periods" ||
    pathname.startsWith("/manager/academic-periods");
  const isArticles =
    pathname === "/articles" || pathname.startsWith("/manager/articles");
  const isTeams =
    pathname === "/teams" || pathname.startsWith("/manager/teams");

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        width,
        height,
        flexShrink: 0,
        p: 2,
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <List component="nav" sx={{ pt: 1 }}>
        <ListItemButton
          selected={isDashboard}
          onClick={() => navigate("/")}
          sx={{
            borderRadius: 1.5,
            mb: 1,
            "&.Mui-selected": {
              bgcolor: "primary.soft",
              color: "primary.main",
              fontWeight: 700,
              borderLeft: "4px solid",
              borderColor: "primary.main",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 36,
              color: isDashboard ? "primary.main" : "text.secondary",
            }}
          >
            <HomeIcon />
          </ListItemIcon>
          <ListItemText
            primary="Dashboard"
            slotProps={{
              primary: {
                variant: "body2",
                sx: { fontWeight: isDashboard ? 700 : 500 },
              },
            }}
          />
        </ListItemButton>

        <ListItemButton
          selected={isAcademicPeriods}
          onClick={() => navigate("/academic-periods")}
          sx={{
            borderRadius: 1.5,
            mb: 1,
            "&.Mui-selected": {
              bgcolor: "warning.soft",
              color: "warning.main",
              fontWeight: 700,
              borderLeft: "4px solid",
              borderColor: "warning.main",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 36,
              color: isAcademicPeriods ? "warning.main" : "text.secondary",
            }}
          >
            <CalendarTodayIcon />
          </ListItemIcon>
          <ListItemText
            primary="Ciclos Acadêmicos"
            slotProps={{
              primary: {
                variant: "body2",
                sx: { fontWeight: isAcademicPeriods ? 700 : 500 },
              },
            }}
          />
        </ListItemButton>

        <ListItemButton
          selected={isArticles}
          onClick={() => navigate("/articles")}
          sx={{
            borderRadius: 1.5,
            mb: 1,
            "&.Mui-selected": {
              bgcolor: "success.soft",
              color: "success.main",
              fontWeight: 700,
              borderLeft: "4px solid",
              borderColor: "success.main",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 36,
              color: isArticles ? "success.main" : "text.secondary",
            }}
          >
            <ArticleIcon />
          </ListItemIcon>
          <ListItemText
            primary="Artigos"
            slotProps={{
              primary: {
                variant: "body2",
                sx: { fontWeight: isArticles ? 700 : 500 },
              },
            }}
          />
        </ListItemButton>

        <ListItemButton
          selected={isTeams}
          onClick={() => navigate("/teams")}
          sx={{
            borderRadius: 1.5,
            mb: 1,
            "&.Mui-selected": {
              bgcolor: "info.soft",
              color: "info.main",
              fontWeight: 700,
              borderLeft: "4px solid",
              borderColor: "info.main",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 36,
              color: isTeams ? "info.main" : "text.secondary",
            }}
          >
            <GroupsIcon />
          </ListItemIcon>
          <ListItemText
            primary="Gestão de Equipes"
            slotProps={{
              primary: {
                variant: "body2",
                sx: { fontWeight: isTeams ? 700 : 500 },
              },
            }}
          />
        </ListItemButton>
      </List>
    </Paper>
  );
};
