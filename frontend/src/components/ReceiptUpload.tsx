"use client";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload } from "lucide-react";

interface Props {
  reportId: string;
  itemId?: string;
  onUploaded: (data: {
    receiptUrl: string;
    receiptPreviewUrl?: string;
    originalFilename?: string;
    extracted?: {
      merchantName: string | null;
      amount: string | null;
      currency: string | null;
      transactionDate: string | null;
    };
  }) => void;
}

export default function ReceiptUpload({ reportId, itemId, onUploaded }: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const inputId = `receipt-${itemId ?? `new-${reportId}`}`;

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFilename(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("uploading");
      setMessage("Uploading & extracting receipt...");
      const endpoint = itemId
        ? `/api/reports/${reportId}/items/${itemId}/receipt`
        : `/api/reports/${reportId}/receipt`;
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("done");
      setMessage("Upload complete. Receipt attached.");
      onUploaded({
        receiptUrl: res.data.receiptUrl,
        receiptPreviewUrl: res.data.receiptPreviewUrl,
        originalFilename: file.name,
        extracted: res.data.extracted,
      });
    } catch {
      setStatus("error");
      setMessage("Upload failed");
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
          onClick={() => document.getElementById(inputId)?.click()}
          iconStart={<Upload />}
        >
          {status === "uploading" ? "Uploading..." : "Upload receipt"}
        </Button>
        <input
          id={inputId}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={onChange}
        />
      </label>
      {selectedFilename ? (
        <p className="text-xs text-muted-foreground truncate">
          Selected: {selectedFilename}
        </p>
      ) : null}
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
