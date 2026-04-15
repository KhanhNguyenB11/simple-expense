"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import ReceiptUpload from "@/components/ReceiptUpload";
import ReportForm from "@/components/reports/report-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createItemSchema,
  type CreateItemFormValues,
} from "@/lib/schemas/report/create-item.schema";
import { type CreateReportFormValues } from "@/lib/schemas/report/create-report.schema";

type ReportItem = {
  id: string;
  merchantName: string;
  amount: string;
  currency: string;
  category: string;
  transactionDate: string;
  receiptUrl?: string | null;
};

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const qc = useQueryClient();
  const [editingItem, setEditingItem] = useState<ReportItem | null>(null);

  const form = useForm<CreateItemFormValues>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      merchantName: "",
      amount: "",
      currency: "USD",
      category: "",
      transactionDate: "",
    },
  });

  const reportQuery = useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => (await api.get(`/api/reports/${reportId}`)).data,
  });

  const report = reportQuery.data;
  const canEdit = report?.status === "DRAFT" || report?.status === "REJECTED";

  const addItem = useMutation({
    mutationFn: async (payload: CreateItemFormValues) =>
      (await api.post(`/api/reports/${reportId}/items`, payload)).data,
    onSuccess: () => {
      form.reset();
      qc.invalidateQueries({ queryKey: ["report", reportId] });
    },
  });

  const submitReport = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/reports/${reportId}/submit`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", reportId] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const updateReport = useMutation({
    mutationFn: async (values: CreateReportFormValues) =>
      (
        await api.patch(`/api/reports/${reportId}`, {
          title: values.title.trim(),
          description: values.description?.trim() || "",
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", reportId] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) =>
      (await api.delete(`/api/reports/${reportId}/items/${itemId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report", reportId] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({
      itemId,
      values,
    }: {
      itemId: string;
      values: CreateItemFormValues;
    }) =>
      (await api.patch(`/api/reports/${reportId}/items/${itemId}`, values))
        .data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", reportId] });
      form.reset();
      setEditingItem(null);
    },
  });

  function onSubmit(values: CreateItemFormValues) {
    if (editingItem) {
      updateItem.mutate({ itemId: editingItem.id, values });
      return;
    }
    addItem.mutate(values);
  }

  function startEditItem(item: ReportItem) {
    setEditingItem(item);
    form.reset({
      merchantName: item.merchantName ?? "",
      amount: String(item.amount ?? ""),
      currency: item.currency ?? "USD",
      category: item.category ?? "",
      transactionDate: item.transactionDate?.slice(0, 10) ?? "",
    });
  }

  function cancelEditItem() {
    setEditingItem(null);
    form.reset({
      merchantName: "",
      amount: "",
      currency: "USD",
      category: "",
      transactionDate: "",
    });
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      {reportQuery.isLoading && (
        <p className="text-muted-foreground text-sm">Loading...</p>
      )}

      {report && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{report.title}</CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    {report.description || "No description"}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
            </CardHeader>
          </Card>

          {canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit report</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportForm
                  initialValues={{
                    title: report.title,
                    description: report.description || "",
                  }}
                  submitText="Save report"
                  isSubmitting={updateReport.isPending}
                  onSubmit={(values) => updateReport.mutate(values)}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(report.items || []).map((item: ReportItem) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-2">
                  {editingItem?.id === item.id ? (
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <FieldGroup className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Controller
                          name="merchantName"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor={field.name}>
                                Merchant
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
                              <FieldLabel htmlFor={field.name}>Date</FieldLabel>
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
                      {canEdit && (
                        <ReceiptUpload
                          reportId={reportId}
                          itemId={item.id}
                          onExtracted={(data) => {
                            if (data.merchantName)
                              form.setValue("merchantName", data.merchantName);
                            if (data.amount)
                              form.setValue("amount", data.amount);
                            if (data.currency)
                              form.setValue("currency", data.currency);
                            if (data.transactionDate) {
                              form.setValue(
                                "transactionDate",
                                data.transactionDate.slice(0, 10),
                              );
                            }
                          }}
                        />
                      )}

                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="submit"
                            disabled={addItem.isPending || updateItem.isPending}
                          >
                            {editingItem
                              ? updateItem.isPending
                                ? "Saving..."
                                : "Save changes"
                              : addItem.isPending
                                ? "Saving..."
                                : "Add item"}
                          </Button>
                          {editingItem ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelEditItem}
                            >
                              Cancel edit
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.merchantName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.amount} {item.currency} · {item.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && editingItem?.id !== item.id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditItem(item)}
                          >
                            Edit details
                          </Button>
                        ) : null}

                        {canEdit && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteItem.mutate(item.id)}
                            disabled={deleteItem.isPending}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{"Add item"}</CardTitle>
            </CardHeader>
            <CardContent>
              {!canEdit ? (
                <p className="text-sm text-muted-foreground">
                  Report is locked in {report.status} state.
                </p>
              ) : (
                // ADD items form only
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <FieldGroup className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      name="merchantName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Merchant</FieldLabel>
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
                          <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
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
                          <FieldLabel htmlFor={field.name}>Currency</FieldLabel>
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
                          <FieldLabel htmlFor={field.name}>Category</FieldLabel>
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
                          <FieldLabel htmlFor={field.name}>Date</FieldLabel>
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

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        disabled={addItem.isPending || updateItem.isPending}
                      >
                        {editingItem
                          ? updateItem.isPending
                            ? "Saving..."
                            : "Save changes"
                          : addItem.isPending
                            ? "Saving..."
                            : "Add item"}
                      </Button>
                      {editingItem ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEditItem}
                        >
                          Cancel edit
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Separator />

          {canEdit && (
            <Button
              size="lg"
              onClick={() => submitReport.mutate()}
              disabled={submitReport.isPending}
            >
              {submitReport.isPending ? "Submitting..." : "Submit report"}
            </Button>
          )}
        </>
      )}
    </main>
  );
}
