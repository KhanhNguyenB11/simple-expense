"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearUser, getUser, type AuthUser } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

export default function ReportsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const isAdmin = currentUser?.role === "admin";
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(getUser());
  }, []);

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

  const handleDelete = (reportId: string) => {
    const confirmed = window.confirm(
      "Delete this report? This action cannot be undone.",
    );
    if (!confirmed) return;

    setDeletingReportId(reportId);
    deleteMutation.mutate(reportId);
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      clearUser();
      router.push("/login");
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6 ">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-foreground"
            >
              ExpenseTrack
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {currentUser?.email ?? "Unknown user"}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {currentUser?.role ?? "user"}
              </p>
            </div>
            <Button variant="outline" size={"sm"} onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <Separator />
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
          onClick={() => router.push("/reports/new")}
        >
          New Report
        </Button>
      </div>

      {reportsQuery.isLoading ? (
        <div className="flex items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : (
        <div className="space-y-3">
          {(reportsQuery.data || []).map((r: any) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
              onClick={() => router.push(`/reports/${r.id}`)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {r.status === "DRAFT" ? (
                    <Button
                      variant="destructive"
                      size="sm"
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
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
