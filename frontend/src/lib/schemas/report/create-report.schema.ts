import { z } from "zod";

export const createReportSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
});

export type CreateReportFormValues = z.infer<typeof createReportSchema>;
