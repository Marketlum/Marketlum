"use client";

import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  File,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FileUpload, formatFileSize, isImageFile } from "./types";
import { cn } from "@/lib/utils";

type FileGridProps = {
  files: FileUpload[];
  selectedFileId: string | null;
  onSelectFile: (file: FileUpload) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  apiBaseUrl: string;
};

function getFileIcon(file: FileUpload) {
  if (file.mimeType.startsWith("image/")) return ImageIcon;
  if (file.mimeType.startsWith("video/")) return Video;
  if (file.mimeType.startsWith("audio/")) return Music;
  if (file.mimeType === "application/pdf") return FileText;
  return File;
}

export function FileGrid({
  files,
  selectedFileId,
  onSelectFile,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  apiBaseUrl,
}: FileGridProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <File className="h-12 w-12 mb-2" />
        <p>No files found</p>
        <p className="text-sm">Upload files or select a different folder</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {files.map((file) => {
            const isSelected = selectedFileId === file.id;
            const IconComponent = getFileIcon(file);

            return (
              <div
                key={file.id}
                className={cn(
                  "group relative flex flex-col items-center p-2 rounded-lg border cursor-pointer hover:border-primary transition-colors",
                  isSelected && "border-primary bg-primary/5"
                )}
                onClick={() => onSelectFile(file)}
              >
                {/* Thumbnail or icon */}
                <div className="w-full aspect-square flex items-center justify-center bg-muted rounded-md overflow-hidden mb-2">
                  {isImageFile(file) ? (
                    <img
                      src={`${apiBaseUrl}/files/${file.id}/thumbnail`}
                      alt={file.altText || file.originalName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if thumbnail fails
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <IconComponent
                    className={cn(
                      "h-12 w-12 text-muted-foreground",
                      isImageFile(file) && "hidden"
                    )}
                  />
                </div>

                {/* Filename */}
                <p className="text-xs text-center truncate w-full" title={file.originalName}>
                  {file.originalName}
                </p>

                {/* File size */}
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.sizeBytes)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} files
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
