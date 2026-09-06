import { z } from "zod";

export const nitParecerSchema = z.object({
  nitStatus: z.enum(["APPROVED_NIT", "REJECTED_NIT"], {
    message: "Selecione o parecer do NIT (Aprovado ou Rejeitado)",
  }),
  nitNotes: z
    .string()
    .min(5, "O parecer técnico deve conter pelo menos 5 caracteres")
    .max(500, "O parecer deve ter no máximo 500 caracteres"),
});

export type NITParecerFormData = z.infer<typeof nitParecerSchema>;
