import { z } from "zod";

// Aligns with backend CreateItemDto validation rules.
export const createItemSchema = z.object({
  merchantName: z.string().min(1, "Merchant is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal (e.g. 49.99)"),
  currency: z
    .string()
    .min(1, "Currency is required")
    .max(10, "Currency is too long")
    .transform((value) => value.toUpperCase()),
  category: z.string().min(1, "Category is required"),
  transactionDate: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export type CreateItemFormValues = z.infer<typeof createItemSchema>;
