"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import ReportForm from "@/components/reports/report-form";
import ReportListCard from "@/components/reports/report-list-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { type CreateReportFormValues } from "@/lib/schemas/report/create-report.schema";

type ReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
type StatusTab = "ALL" | ReportStatus;
type ReportListItem = {
  id: string;
  title: string;
  description?: string | null;
  status: ReportStatus;
};

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const PAGE_SIZE = 6;

export default function ReportsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    retry: false,
  });
  const isAdmin = meQuery.data?.role === "admin";
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: async () => (await api.get("/api/reports")).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) =>
      (await api.delete(`/api/reports/${reportId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setDeletingReportId(null);
    },
    onError: () => {
      setDeletingReportId(null);
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async (values: CreateReportFormValues) =>
      (
        await api.post("/api/reports", {
          title: values.title.trim(),
          description: values.description?.trim() || "",
        })
      ).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["reports"] });
      setIsCreateOpen(false);
    },
  });

  const handleDelete = (reportId: string) => {
    const confirmed = window.confirm(
      "Delete this report? This action cannot be undone.",
    );
    if (!confirmed) return;

    setDeletingReportId(reportId);
    deleteMutation.mutate(reportId);
  };

  const allReports = (reportsQuery.data || []) as ReportListItem[];
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
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isAdmin ? "All Expense Reports" : "My Expense Reports"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Review and manage expense reports from all employees"
              : "Create, manage and submit your expense reports"}
          </p>
        </div>
        <Button
          variant={"default"}
          size={"lg"}
          onClick={() => setIsCreateOpen(true)}
          iconStart={<Plus />}
        >
          New Report
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create report</DialogTitle>
            <DialogDescription>
              Add a title and optional description to start a new expense
              report.
            </DialogDescription>
          </DialogHeader>
          <ReportForm
            submitText="Create report"
            isSubmitting={createReportMutation.isPending}
            onSubmit={(values) => createReportMutation.mutate(values)}
            onCancel={() => setIsCreateOpen(false)}
          />
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
              onClick={() => router.push(`/reports/${r.id}`)}
              className="hover:ring-2 hover:ring-primary/30 transition-all"
              actions={
                r.status === "DRAFT" ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    iconStart={<Trash2 />}
                    disabled={
                      deleteMutation.isPending && deletingReportId === r.id
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r.id);
                    }}
                  >
                    {deleteMutation.isPending && deletingReportId === r.id
                      ? "Deleting..."
                      : "Delete"}
                  </Button>
                ) : null
              }
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
