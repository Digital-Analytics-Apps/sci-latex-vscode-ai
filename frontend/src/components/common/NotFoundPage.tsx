import HomeIcon from "@mui/icons-material/Home";
import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        textAlign: "center",
        px: 2,
      }}
    >
      <Typography
        variant="h1"
        color="primary"
        sx={{ fontWeight: 800, fontSize: "6rem", mb: 1 }}
      >
        404
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Página não encontrada
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: 480, mb: 4 }}
      >
        A página que você está procurando pode ter sido removida, alterada de
        nome ou está temporariamente indisponível.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<HomeIcon />}
        onClick={() => navigate("/")}
        sx={{ fontWeight: 700 }}
      >
        Voltar para a Página Inicial
      </Button>
    </Box>
  );
};
