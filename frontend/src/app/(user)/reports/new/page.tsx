"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReportForm from "@/components/reports/report-form";
import { type CreateReportFormValues } from "@/lib/schemas/report/create-report.schema";

export default function NewReportPage() {
  const router = useRouter();

  const createReport = useMutation({
    mutationFn: async (values: CreateReportFormValues) =>
      (
        await api.post("/api/reports", {
          title: values.title.trim(),
          description: values.description?.trim() || "",
        })
      ).data,
    onSuccess: (report) => {
      router.push(`/reports/${report.id}`);
    },
  });

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create report</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportForm
            submitText="Create report"
            isSubmitting={createReport.isPending}
            onSubmit={(values) => createReport.mutate(values)}
            onCancel={() => router.push("/reports")}
          />
        </CardContent>
      </Card>
    </main>
  );
}
