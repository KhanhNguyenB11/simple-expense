"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  createReportSchema,
  type CreateReportFormValues,
} from "@/lib/schemas/report/create-report.schema";

type ReportFormProps = {
  initialValues?: Partial<CreateReportFormValues>;
  onSubmit: (values: CreateReportFormValues) => void;
  submitText: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
};

export default function ReportForm({
  initialValues,
  onSubmit,
  submitText,
  isSubmitting = false,
  onCancel,
}: ReportFormProps) {
  const form = useForm<CreateReportFormValues>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
    });
  }, [form, initialValues?.title, initialValues?.description]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-4"
      noValidate
    >
      <FieldGroup>
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Title</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Q1 Travel Expenses"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Description</FieldLabel>
              <Textarea
                {...field}
                id={field.name}
                value={field.value ?? ""}
                placeholder="Optional notes"
                rows={4}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitText}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
