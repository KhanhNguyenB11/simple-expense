"use client";

import { Check, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ReportListCard from "@/components/reports/report-list-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
type StatusTab = "ALL" | ReportStatus;

type AdminReportListItem = {
  id: string;
  title: string;
  description?: string | null;
  status: ReportStatus;
  user?: { email?: string | null };
};

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const PAGE_SIZE = 6;

export default function AdminReportsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [actingReportId, setActingReportId] = useState<string | null>(null);
  const [rejectingReport, setRejectingReport] =
    useState<AdminReportListItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const reportsQuery = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => (await api.get("/api/admin/reports")).data,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "approve" | "reject";
      reason?: string;
    }) => {
      setActingReportId(id);
      return (
        await api.patch(`/api/admin/reports/${id}/action`, {
          action,
          ...(reason ? { reason } : {}),
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      setRejectingReport(null);
      setRejectReason("");
    },
    onSettled: () => setActingReportId(null),
  });

  const allReports = (reportsQuery.data || []) as AdminReportListItem[];
  const filteredReports = useMemo(() => {
    if (activeTab === "ALL") return allReports;
    return allReports.filter((report) => report.status === activeTab);
  }, [activeTab, allReports]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredReports]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const tabCount = (status: StatusTab) => {
    if (status === "ALL") return allReports.length;
    return allReports.filter((report) => report.status === status).length;
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          All Expense Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and manage expense reports from all employees.
        </p>
      </div>

      <Dialog
        open={Boolean(rejectingReport)}
        onOpenChange={(open) => {
          if (!open && !actionMutation.isPending) {
            setRejectingReport(null);
            setRejectReason("");
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

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Report:{" "}
              <span className="font-medium">{rejectingReport?.title}</span>
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Missing receipt for taxi expense and incorrect transaction date."
              rows={4}
              disabled={actionMutation.isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectingReport(null);
                setRejectReason("");
              }}
              disabled={actionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!rejectingReport) return;
                actionMutation.mutate({
                  id: rejectingReport.id,
                  action: "reject",
                  reason: rejectReason.trim(),
                });
              }}
              disabled={!rejectReason.trim() || actionMutation.isPending}
              iconStart={<X />}
            >
              {actionMutation.isPending &&
              actingReportId === rejectingReport?.id
                ? "Rejecting..."
                : "Reject report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label} ({tabCount(tab.value)})
            </Button>
          );
        })}
      </div>

      {reportsQuery.isLoading ? (
        <div className="flex items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No {activeTab === "ALL" ? "reports" : activeTab.toLowerCase()}{" "}
                reports found.
              </CardContent>
            </Card>
          ) : null}

          {paginatedReports.map((r) => (
            <ReportListCard
              key={r.id}
              title={r.title}
              description={r.description}
              status={r.status}
              ownerEmail={r.user?.email || "Unknown"}
              reportId={r.id}
              onClick={() => router.push(`/admin/reports/${r.id}`)}
            />
          ))}

          {filteredReports.length > 0 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  iconStart={<ChevronLeft />}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  iconEnd={<ChevronRight />}
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
