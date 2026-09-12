import { z } from "zod";

export const createPRSchema = z.object({
  title: z
    .string()
    .min(3, "O título deve conter pelo menos 3 caracteres")
    .max(120, "O título deve ter no máximo 120 caracteres"),
  description: z.string().optional(),
  taskId: z.string().optional(),
  reviewerId: z.string().optional(),
});

export type CreatePRFormData = z.infer<typeof createPRSchema>;
