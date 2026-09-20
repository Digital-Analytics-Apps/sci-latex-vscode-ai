import { z } from "zod";

export const nitDispatchSchema = z.object({
  sentToNitAt: z.string().optional(),
  sentToNitNotes: z.string().optional(),
});

export const nitParecerSchema = z.object({
  nitStatus: z.enum(["APPROVED_NIT", "REJECTED_NIT", "WAITING_NIT"], {
    message: "Selecione o parecer do NIT (Aprovado ou Rejeitado)",
  }),
  nitNotes: z.string().optional(),
  sentToNitAt: z.string().optional(),
  sentToNitNotes: z.string().optional(),
  nitApprovedAt: z.string().optional(),
});

export type NITDispatchFormData = z.infer<typeof nitDispatchSchema>;
export type NITParecerFormData = z.infer<typeof nitParecerSchema>;
