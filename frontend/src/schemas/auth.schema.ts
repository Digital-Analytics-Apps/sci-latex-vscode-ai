import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Formato de e-mail inválido").min(1, "E-mail é obrigatório"),
  password: z.string().min(6, "A senha deve conter no mínimo 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
