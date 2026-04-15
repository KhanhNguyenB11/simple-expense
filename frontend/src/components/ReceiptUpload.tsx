"use client";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  reportId: string;
  itemId: string;
  onExtracted: (data: {
    merchantName: string | null;
    amount: string | null;
    currency: string | null;
    transactionDate: string | null;
  }) => void;
}

export default function ReceiptUpload({
  reportId,
  itemId,
  onExtracted,
}: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("uploading");
      setMessage("AI extraction in progress...");
      const res = await api.post(
        `/api/reports/${reportId}/items/${itemId}/receipt`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setStatus("done");
      setMessage("Extraction complete. Fields pre-filled below.");
      onExtracted(res.data.extracted);
    } catch {
      setStatus("error");
      setMessage("Upload/extraction failed");
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={status === "uploading"}
          onClick={() => document.getElementById(`receipt-${itemId}`)?.click()}
        >
          {status === "uploading" ? "Uploading..." : "Upload receipt"}
        </Button>
        <input
          id={`receipt-${itemId}`}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={onChange}
        />
      </label>
      {status === "done" ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {status === "uploading" ? (
        <p className="text-xs text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
