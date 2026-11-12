import { z } from "zod";

export const createTodoSchema = z.object({
  title: z.string().min(1, "title cannot be empty").max(200),
  completed: z.boolean().optional().default(false),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200),
  completed: z.boolean(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
