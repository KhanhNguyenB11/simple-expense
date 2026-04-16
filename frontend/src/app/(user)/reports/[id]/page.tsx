"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Save,
  Send,
  Trash2,
  FileText,
  Package,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import ItemForm from "@/components/reports/item-form";
import ReportDetailsShared from "@/components/reports/report-details-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createItemSchema,
  type CreateItemFormValues,
} from "@/lib/schemas/report/create-item.schema";
import { getCurrentUser } from "@/lib/auth";

type ReportItem = {
  id: string;
  merchantName: string;
  amount: string;
  currency: string;
  category: string;
  transactionDate: string;
  receiptUrl?: string | null;
};

type ReportDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  items: ReportItem[];
};

const NEW_ITEM_PREFIX = "tmp-";

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const qc = useQueryClient();

  const [editingItem, setEditingItem] = useState<ReportItem | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftItems, setDraftItems] = useState<ReportItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    queryFn: async () =>
      (await api.get(`/api/reports/${reportId}`)).data as ReportDetail,
  });

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    retry: false,
  });
  const isAdmin = meQuery.data?.role === "admin";

  const report = reportQuery.data;
  const canEdit = report?.status === "DRAFT" || report?.status === "REJECTED";

  useEffect(() => {
    if (!report) return;

    setDraftTitle(report.title ?? "");
    setDraftDescription(report.description ?? "");
    setDraftItems((report.items || []) as ReportItem[]);
    setIsDirty(false);
    setEditingItem(null);

    form.reset({
      merchantName: "",
      amount: "",
      currency: "USD",
      category: "",
      transactionDate: "",
    });
  }, [report, form]);

  const submitReport = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/reports/${reportId}/submit`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", reportId] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const saveDraft = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/api/reports/${reportId}/draft`, {
          title: draftTitle.trim(),
          description: draftDescription.trim(),
          items: draftItems.map((item) => ({
            ...(item.id.startsWith(NEW_ITEM_PREFIX) ? {} : { id: item.id }),
            amount: String(item.amount),
            currency: item.currency,
            category: item.category,
            merchantName: item.merchantName,
            transactionDate: item.transactionDate.slice(0, 10),
            ...(item.receiptUrl ? { receiptUrl: item.receiptUrl } : {}),
          })),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", reportId] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setIsDirty(false);
    },
  });

  function onSubmit(
    values: CreateItemFormValues,
    meta?: { receiptUrl?: string | null },
  ) {
    if (editingItem) {
      setDraftItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                merchantName: values.merchantName,
                amount: values.amount,
                currency: values.currency,
                category: values.category,
                transactionDate: values.transactionDate,
                ...(meta?.receiptUrl !== undefined
                  ? { receiptUrl: meta.receiptUrl }
                  : {}),
              }
            : item,
        ),
      );
      setEditingItem(null);
    } else {
      const newId = `${NEW_ITEM_PREFIX}${Date.now()}`;
      setDraftItems((prev) => [
        ...prev,
        {
          id: newId,
          merchantName: values.merchantName,
          amount: values.amount,
          currency: values.currency,
          category: values.category,
          transactionDate: values.transactionDate,
          receiptUrl: meta?.receiptUrl ?? null,
        },
      ]);
    }

    setIsDirty(true);
    form.reset({
      merchantName: "",
      amount: "",
      currency: "USD",
      category: "",
      transactionDate: "",
    });
    setIsCreateOpen(false);
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

  function removeDraftItem(itemId: string) {
    setDraftItems((prev) => prev.filter((item) => item.id !== itemId));
    if (editingItem?.id === itemId) {
      cancelEditItem();
    }
    setIsDirty(true);
  }

  const totalAmount = draftItems.reduce((sum, item) => {
    const amount = parseFloat(String(item.amount)) || 0;
    return sum + amount;
  }, 0);

  const currencySymbol: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
  };

  const primaryCurrency = draftItems[0]?.currency || "USD";
  const symbol = currencySymbol[primaryCurrency] || primaryCurrency;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/reports")}
          iconStart={<ArrowLeft />}
        >
          Back to reports
        </Button>
      </div>

      {reportQuery.isLoading && (
        <p className="text-muted-foreground text-sm">Loading...</p>
      )}

      {report && (
        <>
          {canEdit ? (
            <Card className="border-l-4 border-l-slate-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <CardTitle className="text-lg font-semibold">
                    Report info
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Title</p>
                  <Input
                    value={draftTitle}
                    onChange={(e) => {
                      setDraftTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. April travel expenses"
                    disabled={saveDraft.isPending || submitReport.isPending}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Description</p>
                  <Textarea
                    value={draftDescription}
                    onChange={(e) => {
                      setDraftDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Optional notes for the approver"
                    rows={3}
                    disabled={saveDraft.isPending || submitReport.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          <ReportDetailsShared
            title={draftTitle || report.title}
            description={draftDescription || report.description}
            status={report.status}
            rejectionReason={report.rejectionReason}
            totalAmountText={`${symbol}${totalAmount.toFixed(2)}`}
            summarySubtext={primaryCurrency}
            itemCount={draftItems.length}
            showReportDetails={isAdmin}
            itemsHeaderRight={
              <span className="ml-auto text-sm font-semibold text-muted-foreground">
                {draftItems.length} items
              </span>
            }
            summaryExtra={
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average</span>
                <span className="font-semibold">
                  {symbol}
                  {draftItems.length > 0
                    ? (totalAmount / draftItems.length).toFixed(2)
                    : "0.00"}
                </span>
              </div>
            }
          >
            {draftItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No items added yet
              </p>
            ) : null}
            {draftItems.map((item: ReportItem) => (
              <div
                key={item.id}
                className="border border-gray-400 rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors"
              >
                {editingItem?.id === item.id ? (
                  <ItemForm
                    form={form}
                    onSubmit={onSubmit}
                    submitText="Save changes"
                    isSubmitting={saveDraft.isPending}
                    onCancel={cancelEditItem}
                    reportId={reportId}
                    itemId={item.id}
                    canEdit={canEdit}
                    initialReceiptUrl={item.receiptUrl ?? null}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.merchantName}</p>
                      <p className="text-sm text-muted-foreground">
                        {symbol}
                        {parseFloat(String(item.amount)).toFixed(2)}{" "}
                        {item.currency}
                        {" · "}
                        {item.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditItem(item)}
                        iconStart={<Pencil />}
                      >
                        Details
                      </Button>

                      {canEdit ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeDraftItem(item.id)}
                          disabled={saveDraft.isPending}
                          iconStart={<Trash2 />}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!isCreateOpen && canEdit && (
              <div className="flex justify-end">
                <Button
                  iconStart={<Plus />}
                  onClick={() => setIsCreateOpen(true)}
                >
                  Add new item
                </Button>
              </div>
            )}

            {canEdit && isCreateOpen ? (
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-lg font-semibold">
                      Add New Item
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ItemForm
                    form={form}
                    onSubmit={onSubmit}
                    submitText="Add item"
                    isSubmitting={saveDraft.isPending}
                    canEdit={canEdit}
                    onCancel={() => setIsCreateOpen(false)}
                    reportId={reportId}
                  />
                </CardContent>
              </Card>
            ) : null}
          </ReportDetailsShared>

          <Separator />

          {canEdit ? (
            <div className="flex flex-col justify-center items-end flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {isDirty
                  ? "Save your pending edits first. This button will turn into Submit report once everything is saved."
                  : "Your draft is up to date and ready to submit."}
              </p>
              <Button
                size="lg"
                onClick={() => {
                  if (isDirty) {
                    saveDraft.mutate();
                    return;
                  }

                  submitReport.mutate();
                }}
                disabled={saveDraft.isPending || submitReport.isPending}
                iconStart={isDirty ? <Save /> : <Send />}
              >
                {saveDraft.isPending
                  ? "Saving..."
                  : submitReport.isPending
                    ? "Submitting..."
                    : isDirty
                      ? "Save changes"
                      : "Submit report"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
