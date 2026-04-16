"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

type ReceiptViewerProps = {
  receiptKey: string;
  receiptPreviewUrl?: string | null;
  label?: string;
};

function isImageKey(key: string) {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

export default function ReceiptViewer({
  receiptKey,
  receiptPreviewUrl,
  label = "Receipt",
}: ReceiptViewerProps) {
  const previewQuery = useQuery({
    queryKey: ["files", "presigned-url", receiptKey],
    enabled: Boolean(receiptKey) && !receiptPreviewUrl,
    queryFn: async () => {
      const res = await api.get(`/api/files/presigned-url`, {
        params: { key: receiptKey },
      });
      return res.data as { presignedUrl: string };
    },
    staleTime: 45 * 1000,
  });

  const url = receiptPreviewUrl ?? previewQuery.data?.presignedUrl ?? null;
  const isImage = isImageKey(receiptKey);
  const filename = receiptKey.split("/").pop() || receiptKey;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{filename}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!url}
          onClick={() => url && window.open(url, "_blank", "noreferrer")}
          iconStart={<ExternalLink className="h-4 w-4" />}
        >
          Open
        </Button>
      </div>

      {previewQuery.isLoading && !receiptPreviewUrl ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparing preview...
        </div>
      ) : null}

      {url && isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Receipt preview"
          className="max-h-64 w-auto rounded-md border bg-background"
        />
      ) : null}

      {!isImage ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>PDF/document preview opens in a new tab</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          <span>Image receipt</span>
        </div>
      )}
    </div>
  );
}

