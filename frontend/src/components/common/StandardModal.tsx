import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_PRESETS: Record<ModalSize, { width: string; height: string }> = {
  sm: { width: "560px", height: "560px" },
  md: { width: "740px", height: "640px" },
  lg: { width: "920px", height: "720px" },
  xl: { width: "1140px", height: "780px" },
};

export interface StandardModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: string;
  size?: ModalSize;
  width?: string | number;
  height?: string | number;

  // Cabeçalho secundário (ex: Abas ou Stepper)
  subheader?: React.ReactNode;

  // Conteúdo principal
  children: React.ReactNode;

  // Integre com formulário
  onSubmit?: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  formId?: string;

  // Opções do Footer Padronizado
  hideFooter?: boolean;
  showCancel?: boolean;
  cancelText?: string;
  onCancel?: () => void;

  showConfirm?: boolean;
  confirmText?: string;
  confirmColor?:
    "primary" | "secondary" | "warning" | "error" | "info" | "success";
  confirmVariant?: "contained" | "outlined" | "text";
  confirmIcon?: React.ReactNode;
  confirmDisabled?: boolean;
  isSubmitting?: boolean;
  onConfirm?: (e: React.SyntheticEvent) => void;

  // Ações extras no rodapé (lado esquerdo)
  extraFooterActions?: React.ReactNode;
}

export const StandardModal: React.FC<StandardModalProps> = ({
  open,
  onClose,
  title,
  icon,
  subtitle,
  size = "md",
  width,
  height,
  subheader,
  children,
  onSubmit,
  formId,
  hideFooter = false,
  showCancel = true,
  cancelText = "Cancelar",
  onCancel,
  showConfirm = true,
  confirmText = "Salvar",
  confirmColor = "primary",
  confirmVariant = "contained",
  confirmIcon,
  confirmDisabled = false,
  isSubmitting = false,
  onConfirm,
  extraFooterActions,
}) => {
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.md;
  const modalWidth = width || preset.width;
  const modalHeight = height || preset.height;

  const confirmButtonType: "submit" | "button" =
    formId || onSubmit ? "submit" : "button";

  let confirmStartIcon: React.ReactNode = null;
  if (isSubmitting) {
    confirmStartIcon = <CircularProgress size={18} color="inherit" />;
  } else if (confirmIcon) {
    confirmStartIcon = confirmIcon;
  }

  const handleFormSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    if (onSubmit) {
      onSubmit(e);
    }
  };

  const dialogInnerContent = (
    <Stack
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        gap: 4,
      }}
    >
      {/* CABEÇALHO PADRÃO */}
      <DialogTitle
        sx={{
          py: 2,
          px: 3,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: subheader ? "none" : 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            pr: 2,
          }}
        >
          {icon && (
            <Box sx={{ display: "flex", alignItems: "center" }}>{icon}</Box>
          )}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography
              variant="h6"
              component="span"
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.25 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        <IconButton
          aria-label="Fechar modal"
          onClick={onClose}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* SUBHEADER OPCIONAL (Abas / Stepper) */}
      {subheader && (
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 3,
            bgcolor: "background.paper",
          }}
        >
          {subheader}
        </Box>
      )}

      {/* ÁREA DE CONTEÚDO COM SCROLL INTERNO FIXO */}
      <DialogContent
        dividers={Boolean(subheader)}
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </DialogContent>

      {/* FOOTER PADRONIZADO */}
      {!hideFooter && (
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            justifyContent: "space-between",
          }}
        >
          {/* Lado Esquerdo: Ações Extras (ex: Botão Excluir) */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {extraFooterActions}
          </Box>

          {/* Lado Direito: Ações Padrão (Cancelar & Salvar) */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {showCancel && (
              <Button
                type="button"
                onClick={onCancel || onClose}
                color="inherit"
                disabled={isSubmitting}
              >
                {cancelText}
              </Button>
            )}

            {showConfirm && (
              <Button
                type={confirmButtonType}
                form={formId}
                onClick={onConfirm}
                variant={confirmVariant}
                color={confirmColor}
                disabled={confirmDisabled || isSubmitting}
                startIcon={confirmStartIcon}
              >
                {isSubmitting ? "Processando..." : confirmText}
              </Button>
            )}
          </Box>
        </DialogActions>
      )}
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: modalWidth,
            height: modalHeight,
            maxWidth: "95vw",
            maxHeight: "95vh",
            borderRadius: 3,
            overflow: "hidden",
            m: 1,
          },
        },
      }}
    >
      {onSubmit ? (
        <Box
          component="form"
          onSubmit={handleFormSubmit}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {dialogInnerContent}
        </Box>
      ) : (
        dialogInnerContent
      )}
    </Dialog>
  );
};
