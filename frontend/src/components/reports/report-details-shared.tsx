"use client";

import { AlertCircle, DollarSign, FileText, Package } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

type ReportDetailsSharedProps = {
  title: string;
  description?: string | null;
  status: ReportStatus;
  rejectionReason?: string | null;
  totalAmountText: string;
  summarySubtext?: string;
  itemCount: number;
  itemsHeaderRight?: React.ReactNode;
  summaryExtra?: React.ReactNode;
  children: React.ReactNode;
  showReportDetails?: boolean;
};

export default function ReportDetailsShared({
  title,
  description,
  status,
  rejectionReason,
  totalAmountText,
  summarySubtext,
  itemCount,
  itemsHeaderRight,
  summaryExtra,
  children,
  showReportDetails = true,
}: ReportDetailsSharedProps) {
  return (
    <>
      {showReportDetails ? (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg font-semibold">
                      Report Details
                    </CardTitle>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {title}
                  </h1>
                  <p className="text-muted-foreground">
                    {description || "No description added"}
                  </p>
                </div>
                <StatusBadge status={status} />
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {status === "REJECTED" && rejectionReason ? (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-base font-semibold">
            Report Rejected
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            {rejectionReason}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="">
        <Card className="border-l-4 border-l-amber-500 md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg font-semibold">
                Expense Items
              </CardTitle>
              {itemsHeaderRight}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">{children}</CardContent>
        </Card>
      </div>
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg font-semibold">Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                {totalAmountText}
              </span>
              {summarySubtext ? (
                <span className="text-xs text-muted-foreground">
                  {summarySubtext}
                </span>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Count</span>
              <span className="font-semibold">{itemCount}</span>
            </div>
            {summaryExtra}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
