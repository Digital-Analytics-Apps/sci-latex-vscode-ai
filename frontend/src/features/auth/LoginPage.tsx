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
  CircularProgress,
  Container,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { type LoginFormData, loginSchema } from "../../schemas/auth.schema";
import { api } from "../../services/api";
import { setCredentials } from "../../store/slices/authSlice";
import { useColorMode } from "../../theme";
import { SciLatexAnimatedLogo } from "./components/SciLatexAnimatedLogo";

export const LoginPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "user@google.com",
      password: "123456",
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
      void navigate("/", { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          "E-mail ou senha incorretos. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
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
        py: 4,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "750px",
          height: "750px",
          background: (theme) =>
            `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.22)} 0%, rgba(0,0,0,0) 70%)`,
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

      <Container maxWidth="lg" sx={{ maxWidth: "1140px !important" }}>
        <Card
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 5, md: 6 },
            backdropFilter: "blur(18px)",
            borderColor: "divider",
            borderRadius: 5,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? alpha(theme.palette.background.paper, 0.92)
                : alpha(theme.palette.background.paper, 0.97),
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 30px 60px -15px rgba(0, 0, 0, 0.7)"
                : "0 30px 60px -15px rgba(0, 0, 0, 0.09)",
          }}
        >
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "center",
                gap: { xs: 5, md: 7 },
              }}
            >
              {/* LADO ESQUERDO: Logo Animada + Centralizada + Texto */}
              <Box
                sx={{
                  flex: 1.15,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  pr: { md: 4 },
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <SciLatexAnimatedLogo size={340} mode={mode} />
                </Box>

                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 0.6,
                    borderRadius: 4,
                    bgcolor:
                      mode === "dark"
                        ? "rgba(14, 165, 233, 0.14)"
                        : "rgba(2, 132, 199, 0.1)",
                    color: "primary.main",
                    mb: 2,
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 700, letterSpacing: 1 }}
                  >
                    SCIA — Scientific Collaboration + AI
                  </Typography>
                </Box>

                <Typography
                  variant="h3"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.85rem", md: "1.8rem" },
                    lineHeight: 1.25,
                  }}
                >
                  Write. Collaborate. Review. Advance.
                </Typography>

                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6, maxWidth: 460, fontSize: "1rem" }}
                >
                  Workspace colaborativo de escrita científica em LaTeX, revisão
                  por pares, controle de prazos e governança institucional.
                </Typography>
              </Box>

              {/* LADO DIREITO: Formulário de Autenticação */}
              <Box
                sx={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  pl: { md: 6 },
                  borderLeft: { md: "1px solid" },
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h4"
                  component="h2"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    fontSize: { xs: "1.5rem", md: "1.75rem" },
                  }}
                >
                  Acessar Conta
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Entre com suas credenciais institucionais.
                </Typography>

                {errorMessage && (
                  <Alert severity="error" sx={{ mb: 2.5, fontSize: "0.85rem" }}>
                    {errorMessage}
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                  <Box sx={{ mb: 2.5 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 0.8, fontWeight: 600 }}
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

                  <Box sx={{ mb: 3.5 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 0.8, fontWeight: 600 }}
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
                    sx={{ py: 1.4, fontWeight: 700, fontSize: "0.95rem" }}
                  >
                    {loading ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : (
                      "Entrar no Sistema"
                    )}
                  </Button>
                </form>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
