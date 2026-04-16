"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  FileText,
  Image,
  Download,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FileListProps {
  reportId: string;
  itemId?: string;
  canEdit?: boolean;
}

interface FileInfo {
  key: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export default function FileList({ reportId, itemId, canEdit }: FileListProps) {
  const qc = useQueryClient();
  const endpoint = itemId
    ? `/api/reports/${reportId}/items/${itemId}/files`
    : `/api/reports/${reportId}/files`;

  const { data, isLoading, error } = useQuery<{ files: FileInfo[] }>({
    queryKey: ["files", reportId, itemId],
    queryFn: () => api.get(endpoint).then((res) => res.data),
    staleTime: 30 * 1000, // 30 seconds
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileKey: string) => {
      const url = itemId
        ? `/api/reports/${reportId}/items/${itemId}/files`
        : `/api/reports/${reportId}/files`;
      return (await api.delete(url, { params: { key: fileKey } })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", reportId, itemId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading files...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load files. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const files = data?.files || [];

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No files uploaded yet</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const handleDownload = async (fileKey: string, fileName: string) => {
    try {
      // Get presigned URL for download
      const response = await api.get(`/api/files/presigned-url`, {
        params: { key: fileKey },
      });
      const { presignedUrl } = response.data;

      // Open the URL in a new tab to trigger download or preview
      window.open(presignedUrl, "_blank");
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Uploaded Files</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.key}
              className="flex items-center justify-between p-2 rounded border border-border bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(file.key, file.name)}
                  iconStart={<Download className="h-4 w-4" />}
                >
                  Open
                </Button>
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this attachment? This only deletes the file, not the item.",
                        )
                      ) {
                        deleteMutation.mutate(file.key);
                      }
                    }}
                    iconStart={<Trash2 className="h-4 w-4" />}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
