"use client";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const variantMap: Record<Props["status"], BadgeVariant> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export default function StatusBadge({ status }: Props) {
  return <Badge variant={variantMap[status]}>{status}</Badge>;
}
