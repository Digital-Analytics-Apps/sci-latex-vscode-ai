import { z } from "zod";

export const doiSchema = z.object({
  doi: z.string().min(5, "Informe um DOI válido (ex: 10.1109/XXX.2026.12345)"),
  publicationUrl: z
    .string()
    .url("Informe uma URL válida para a publicação")
    .optional()
    .or(z.literal("")),
  datasetUrl: z
    .string()
    .url("Informe uma URL válida para o dataset")
    .optional()
    .or(z.literal("")),
});

export type DOIFormData = z.infer<typeof doiSchema>;

export const rejectionDecisionSchema = z.object({
  decisionStrategy: z.enum(["SUBMIT_BACKUP", "SUBMIT_NEW_TARGET"], {
    message:
      "Selecione uma estratégia para a versão v2 (Congresso Backup ou Novo Congresso)",
  }),
  newConferenceName: z.string().optional(),
  newConferenceDate: z.string().optional(),
});

export type RejectionDecisionFormData = z.infer<typeof rejectionDecisionSchema>;
