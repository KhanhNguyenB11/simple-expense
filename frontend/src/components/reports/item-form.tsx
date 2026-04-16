"use client";

import { Plus, Save, X } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useState } from "react";
import ReceiptUpload from "@/components/ReceiptUpload";
import ReceiptViewer from "@/components/reports/ReceiptViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { type CreateItemFormValues } from "@/lib/schemas/report/create-item.schema";

type ItemFormProps = {
  form: UseFormReturn<CreateItemFormValues>;
  onSubmit: (
    values: CreateItemFormValues,
    meta?: { receiptUrl?: string | null },
  ) => void;
  submitText: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  reportId?: string;
  itemId?: string;
  canEdit?: boolean;
  initialReceiptUrl?: string | null;
};

function RequiredStar() {
  return <span className="text-destructive"> *</span>;
}

export default function ItemForm({
  form,
  onSubmit,
  submitText,
  isSubmitting = false,
  onCancel,
  reportId,
  itemId,
  canEdit = false,
  initialReceiptUrl = null,
}: ItemFormProps) {
  const isAddAction = submitText.toLowerCase().includes("add");
  const canUploadReceipt = reportId && canEdit;
  const [receiptUrl, setReceiptUrl] = useState<string | null>(
    initialReceiptUrl,
  );
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    null,
  );
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const submitWithMeta = (values: CreateItemFormValues) => {
    onSubmit(values, { receiptUrl });
    if (isAddAction) {
      setReceiptUrl(null);
      setReceiptPreviewUrl(null);
      setAiSummary(null);
    }
  };

  const setIfEmpty = (name: keyof CreateItemFormValues, value: string) => {
    const current = form.getValues(name);
    if (current === undefined || current === null || String(current).trim() === "") {
      form.setValue(name, value, { shouldDirty: true, shouldTouch: true });
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(submitWithMeta)}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      noValidate
    >
      <FieldGroup className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="merchantName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Merchant
                <RequiredStar />
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Merchant name"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="amount"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Amount
                <RequiredStar />
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="0.00"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="currency"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Currency
                <RequiredStar />
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="USD"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="category"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Category
                <RequiredStar />
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="e.g. Travel"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="transactionDate"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Date
                <RequiredStar />
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="date"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>

      {canUploadReceipt ? (
        <ReceiptUpload
          reportId={reportId}
          itemId={itemId}
          onUploaded={(data) => {
            setReceiptUrl(data.receiptUrl);
            setReceiptPreviewUrl(data.receiptPreviewUrl ?? null);

            const extracted = data.extracted;
            if (extracted) {
              const parts: string[] = [];
              if (extracted.merchantName) {
                setIfEmpty("merchantName", extracted.merchantName);
                parts.push(extracted.merchantName);
              }
              if (extracted.amount) {
                setIfEmpty("amount", extracted.amount);
                parts.push(extracted.amount);
              }
              if (extracted.currency) {
                setIfEmpty("currency", extracted.currency);
                parts.push(extracted.currency);
              }
              if (extracted.transactionDate) {
                // Input expects YYYY-MM-DD
                setIfEmpty("transactionDate", extracted.transactionDate.slice(0, 10));
                parts.push(extracted.transactionDate.slice(0, 10));
              }

              if (parts.length > 0) {
                setAiSummary(parts.join(" • "));
              }
            }
          }}
        />
      ) : null}

      {receiptUrl ? (
        <div className="md:col-span-2">
          <ReceiptViewer
            receiptKey={receiptUrl}
            receiptPreviewUrl={receiptPreviewUrl}
            label="Attached receipt"
          />
          <div className="mt-1 flex flex-col gap-0.5">
            {aiSummary ? (
              <p className="text-xs text-foreground">
                AI pre-filled: <span className="font-medium">{aiSummary}</span>
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              This receipt will be saved with the item when you click{" "}
              {isAddAction ? "Add item" : "Save changes"}.
            </p>
          </div>
        </div>
      ) : null}

      <div className="md:col-span-2 flex items-center justify-end gap-2">
        {canEdit && (
          <Button
            type="submit"
            disabled={isSubmitting}
            iconStart={isAddAction ? <Plus /> : <Save />}
          >
            {isSubmitting ? "Saving..." : submitText}
          </Button>
        )}

        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            iconStart={<X />}
          >
            Close
          </Button>
        ) : null}
      </div>
    </form>
  );
}
