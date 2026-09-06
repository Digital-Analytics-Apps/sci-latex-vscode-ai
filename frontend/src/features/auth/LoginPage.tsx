import { zodResolver } from "@hookform/resolvers/zod";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginSchema, type LoginFormData } from "../../schemas/auth.schema";
import { api } from "../../services/api";
import { setCredentials } from "../../store/slices/authSlice";
import { useColorMode } from "../../theme";

export const LoginPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await api.post("/auth/login", data);
      const token = response.data.accessToken || response.data.token;
      const user = response.data.user;
      dispatch(setCredentials({ token, user }));
      navigate("/");
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          "E-mail ou senha incorretos. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (email: string) => {
    setValue("email", email);
    setValue("password", "Password123!");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
        px: 2,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <Tooltip title="Alternar Modo Claro / Escuro">
          <IconButton onClick={toggleColorMode} color="inherit">
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Container maxWidth="xs">
        <Card
          variant="outlined"
          sx={{
            p: 1,
            backdropFilter: "blur(12px)",
            borderColor: "divider",
            bgcolor:
              mode === "dark"
                ? "rgba(17, 24, 39, 0.85)"
                : "rgba(255, 255, 255, 0.95)",
          }}
        >
          <CardContent>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 4,
                  bgcolor:
                    mode === "dark"
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(5, 150, 105, 0.1)",
                  color: "primary.main",
                  mb: 1.5,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                <Typography variant="overline" sx={{ fontWeight: 700 }}>
                  SCI-LaTeX Web Platform
                </Typography>
              </Box>
              <Typography
                variant="h2"
                component="h1"
                gutterBottom
                sx={{ fontWeight: 700 }}
              >
                Escrita Científica Self-Hosted
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entre com suas credenciais para acessar o workspace acadêmico.
              </Typography>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2, fontSize: "0.8rem" }}>
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 0.5, fontWeight: 600 }}
                >
                  E-mail institucional
                </Typography>
                <TextField
                  fullWidth
                  placeholder="usuario@universidade.edu"
                  {...register("email")}
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 0.5, fontWeight: 600 }}
                >
                  Senha de acesso
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                sx={{ py: 1.2, fontWeight: 600 }}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Entrar no Sistema"
                )}
              </Button>
            </form>

            <Paper
              variant="outlined"
              sx={{
                mt: 3,
                p: 1.5,
                bgcolor:
                  mode === "dark"
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(0,0,0,0.02)",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Selecione um perfil de teste:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                <Chip
                  label="Autor"
                  size="small"
                  clickable
                  color="primary"
                  variant="outlined"
                  onClick={() => fillQuickDemo("author@sci-latex.org")}
                />
                <Chip
                  label="Revisor"
                  size="small"
                  clickable
                  color="secondary"
                  variant="outlined"
                  onClick={() => fillQuickDemo("reviewer@sci-latex.org")}
                />
                <Chip
                  label="Coordenador"
                  size="small"
                  clickable
                  color="info"
                  variant="outlined"
                  onClick={() => fillQuickDemo("coordinator@sci-latex.org")}
                />
                <Chip
                  label="Gerente"
                  size="small"
                  clickable
                  color="warning"
                  variant="outlined"
                  onClick={() => fillQuickDemo("manager@sci-latex.org")}
                />
              </Box>
            </Paper>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
