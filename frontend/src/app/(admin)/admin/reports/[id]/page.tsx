"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, FileText, X } from "lucide-react";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReportDetailsShared from "@/components/reports/report-details-shared";
import FileList from "@/components/reports/FileList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

type ReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

type AdminReportItem = {
  id: string;
  merchantName: string;
  amount: string;
  currency: string;
  category: string;
  transactionDate: string;
  receiptUrl?: string | null;
};

type AdminReportDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: ReportStatus;
  rejectionReason?: string | null;
  total_amount: string;
  user?: { id: string; email?: string | null };
  items: AdminReportItem[];
};

export default function AdminReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const reportId = params.id as string;
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  const reportQuery = useQuery({
    queryKey: ["admin-report", reportId],
    queryFn: async () =>
      (await api.get(`/api/admin/reports/${reportId}`))
        .data as AdminReportDetail,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      action,
      reason,
    }: {
      action: "approve" | "reject";
      reason?: string;
    }) => {
      return (
        await api.patch(`/api/admin/reports/${reportId}/action`, {
          action,
          ...(reason ? { reason } : {}),
        })
      ).data;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-report", reportId] }),
        qc.invalidateQueries({ queryKey: ["admin-reports"] }),
      ]);
      setRejectOpen(false);
      setRejectReason("");
    },
  });

  const report = reportQuery.data;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/reports")}
          iconStart={<ArrowLeft />}
        >
          Back to admin reports
        </Button>
      </div>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!actionMutation.isPending) {
            setRejectOpen(open);
            if (!open) setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Reject report</DialogTitle>
            <DialogDescription>
              Provide a clear reason so the employee can fix and re-submit.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Missing receipt for hotel expense and inconsistent date."
            rows={4}
            disabled={actionMutation.isPending}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                setRejectReason("");
              }}
              disabled={actionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                actionMutation.mutate({
                  action: "reject",
                  reason: rejectReason.trim(),
                })
              }
              disabled={!rejectReason.trim() || actionMutation.isPending}
              iconStart={<X />}
            >
              {actionMutation.isPending ? "Rejecting..." : "Reject report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reportQuery.isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner className="size-8" />
        </div>
      ) : null}

      {report ? (
        <>
          <ReportDetailsShared
            title={report.title}
            description={report.description}
            status={report.status}
            rejectionReason={report.rejectionReason}
            totalAmountText={report.total_amount}
            itemCount={report.items.length}
          >
            {report.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No items in this report.
              </p>
            ) : null}

            {report.items.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {item.merchantName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.amount} {item.currency} · {item.category}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.transactionDate.slice(0, 10)}
                    </p>
                  </div>

                  {item.receiptUrl ? (
                    <p className="text-sm font-medium text-foreground">
                      Receipt attached
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No receipt</p>
                  )}
                </div>
                <Separator className="my-2" />
                <FileList
                  reportId={report.id}
                  itemId={item.id}
                  canEdit={false}
                  scope="admin"
                />
              </div>
            ))}
          </ReportDetailsShared>
        </>
      ) : null}
      {report?.status === "SUBMITTED" ? (
        <div className="flex justify-end flex-wrap gap-2">
          <Button
            variant="destructive"
            onClick={() => setRejectOpen(true)}
            disabled={actionMutation.isPending}
            iconStart={<X />}
          >
            Reject
          </Button>
          <Button
            onClick={() => actionMutation.mutate({ action: "approve" })}
            disabled={actionMutation.isPending}
            iconStart={<Check />}
          >
            {actionMutation.isPending ? <Spinner /> : "Approve"}
          </Button>
        </div>
      ) : null}
    </main>
  );
}
