// Utilitário de formatação de datas em português
export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "N/D";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateStr;
  }
};
