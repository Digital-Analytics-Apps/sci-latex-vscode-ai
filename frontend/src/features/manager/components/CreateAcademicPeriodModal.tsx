import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { Box, TextField } from "@mui/material";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { StandardModal } from "../../../components/common/StandardModal";
import { useCreateAcademicPeriodMutation } from "../../../hooks/useManagementQueries";
import { showNotification } from "../../../store/slices/notificationSlice";

interface CreateAcademicPeriodModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateAcademicPeriodModal = ({
  open,
  onClose,
}: CreateAcademicPeriodModalProps) => {
  const dispatch = useDispatch();
  const createPeriodMutation = useCreateAcademicPeriodMutation();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2027-08-31");
  const [targetArticlesCount, setTargetArticlesCount] = useState<number>(15);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createPeriodMutation.mutateAsync({
        name: name.trim(),
        startDate,
        endDate,
        targetArticlesCount: Number(targetArticlesCount),
      });
      dispatch(
        showNotification({
          message: `Novo Período Acadêmico "${name}" criado com sucesso!`,
          severity: "success",
        }),
      );
      setName("");
      onClose();
    } catch {
      dispatch(
        showNotification({
          message: "Erro ao criar Período Acadêmico.",
          severity: "error",
        }),
      );
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<CalendarTodayIcon color="warning" />}
      title="Novo Ciclo Acadêmico"
      subtitle="Defina um novo período institucional de produção científica e sua meta global de artigos."
      onSubmit={handleSubmit}
      confirmText="Criar Ciclo Acadêmico"
      confirmColor="warning"
      isSubmitting={createPeriodMutation.isPending}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          required
          fullWidth
          label="Nome do Ciclo Acadêmico"
          placeholder="Ex: Ciclo Acadêmico 2026/2027"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          required
          fullWidth
          type="date"
          label="Data Inicial"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          required
          fullWidth
          type="date"
          label="Data Final"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          required
          fullWidth
          type="number"
          label="Meta Global de Artigos Concluídos"
          value={targetArticlesCount}
          onChange={(e) => setTargetArticlesCount(Number(e.target.value))}
        />
      </Box>
    </StandardModal>
  );
};
