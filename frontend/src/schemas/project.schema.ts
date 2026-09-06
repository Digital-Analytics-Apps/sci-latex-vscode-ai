import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "O título do artigo deve conter pelo menos 3 caracteres"),
  targetConference: z
    .string()
    .min(2, "Informe o congresso ou periódico alvo (ex: IEEE S&P 2027)"),
  submissionDeadline: z
    .string()
    .min(1, "Selecione a data limite para submissão"),
  template: z.enum(["IEEEtran", "ACM_sigconf", "SBC", "Springer_LNCS"], {
    message: "Selecione o modelo/template LaTeX desejado",
  }),
});

export type CreateProjectFormData = z.infer<typeof createProjectSchema>;
