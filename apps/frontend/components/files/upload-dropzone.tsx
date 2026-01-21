"use client";

import { useCallback, useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadedFile = {
  id: string;
  originalName: string;
};

type UploadDropzoneProps = {
  onUpload: (files: File[]) => Promise<{ uploaded: UploadedFile[]; failed: Array<{ originalName: string; reason: string }> }>;
  onUploadComplete: () => void;
};

type UploadItem = {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

export function UploadDropzone({ onUpload, onUploadComplete }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    const newUploads: UploadItem[] = files.map((file) => ({
      file,
      status: "pending" as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);
    setIsUploading(true);

    // Mark all as uploading
    setUploads((prev) =>
      prev.map((u) =>
        newUploads.some((n) => n.file === u.file) ? { ...u, status: "uploading" as const } : u
      )
    );

    try {
      const result = await onUpload(files);

      // Update statuses based on result
      setUploads((prev) =>
        prev.map((u) => {
          const uploaded = result.uploaded.find(
            (up) => up.originalName === u.file.name
          );
          const failed = result.failed.find(
            (f) => f.originalName === u.file.name
          );

          if (uploaded) {
            return { ...u, status: "success" as const };
          } else if (failed) {
            return { ...u, status: "error" as const, error: failed.reason };
          }
          return u;
        })
      );

      onUploadComplete();
    } catch {
      // Mark all as error
      setUploads((prev) =>
        prev.map((u) =>
          newUploads.some((n) => n.file === u.file)
            ? { ...u, status: "error" as const, error: "Upload failed" }
            : u
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const clearUploads = () => {
    setUploads([]);
  };

  const hasUploads = uploads.length > 0;
  const successCount = uploads.filter((u) => u.status === "success").length;
  const errorCount = uploads.filter((u) => u.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-1">
          {isDragging ? "Drop files here" : "Drag and drop files here"}
        </p>
        <p className="text-sm text-muted-foreground mb-4">or</p>
        <label>
          <Button variant="outline" asChild>
            <span>
              Choose Files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </span>
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-4">
          Supports images, videos, audio, PDFs, and documents. Max 25MB per file.
        </p>
      </div>

      {/* Upload progress */}
      {hasUploads && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isUploading
                ? "Uploading..."
                : `${successCount} uploaded, ${errorCount} failed`}
            </span>
            {!isUploading && (
              <Button variant="ghost" size="sm" onClick={clearUploads}>
                Clear
              </Button>
            )}
          </div>

          <div className="max-h-40 overflow-auto space-y-2">
            {uploads.map((upload, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm"
              >
                {upload.status === "pending" || upload.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : upload.status === "success" ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="flex-1 truncate">{upload.file.name}</span>
                {upload.error && (
                  <span className="text-xs text-destructive">{upload.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
