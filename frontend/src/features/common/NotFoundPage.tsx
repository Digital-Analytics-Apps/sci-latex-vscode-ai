import ErrorIcon from "@mui/icons-material/Error";
import HomeIcon from "@mui/icons-material/Home";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 5,
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          borderRadius: 3,
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: "error.soft",
            color: "error.main",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <ErrorIcon sx={{ fontSize: 44 }} />
        </Box>

        <Typography
          variant="h2"
          sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}
        >
          404
        </Typography>

        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "text.primary", mb: 1.5 }}
        >
          Página não encontrada
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 4, lineHeight: 1.6 }}
        >
          A página que você está procurando não existe, foi removida ou o endereço
          digitado está incorreto.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<HomeIcon />}
          onClick={() => navigate("/")}
          sx={{ fontWeight: 700, px: 3, py: 1.2, borderRadius: 2 }}
        >
          Voltar ao Início
        </Button>
      </Paper>
    </Box>
  );
};
