"use client";

import type { KeyboardEvent, ReactNode } from "react";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

type ReportListCardProps = {
  title: string;
  description?: string | null;
  status: ReportStatus;
  ownerEmail?: string | null;
  reportId?: string;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
};

export default function ReportListCard({
  title,
  description,
  status,
  ownerEmail,
  reportId,
  actions,
  onClick,
  className,
}: ReportListCardProps) {
  const isClickable = Boolean(onClick);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onClick();
  };

  return (
    <Card
      className={cn(
        "border-l-4 border-l-slate-300 transition-colors",
        isClickable && "cursor-pointer hover:border-l-primary/60",
        className,
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <CardContent className="py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate">{title}</p>
              <StatusBadge status={status} />
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {description || "No description provided"}
            </p>

            {ownerEmail || reportId ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {ownerEmail ? (
                  <span className="rounded bg-muted px-2 py-1 text-muted-foreground">
                    Owner: {ownerEmail}
                  </span>
                ) : null}

                {reportId ? (
                  <span className="rounded bg-muted px-2 py-1 text-muted-foreground">
                    ID: {reportId.slice(0, 8)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {actions ? (
            <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
