"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  Upload,
  Search,
  X,
  FileText,
  Image as ImageIcon,
  File,
} from "lucide-react";
import { FileUpload, formatFileSize, isImageFile } from "./types";
import { UploadDropzone } from "./upload-dropzone";
import { cn } from "@/lib/utils";
import api from "@/lib/api-sdk";

type FilePickerProps = {
  value: FileUpload | null;
  onChange: (file: FileUpload | null) => void;
  accept?: string;
};

type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
};

function getFileIcon(file: FileUpload) {
  if (file.mimeType.startsWith("image/")) return ImageIcon;
  if (file.mimeType === "application/pdf") return FileText;
  return File;
}

export function FilePicker({ value, onChange }: FilePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");

  // Library state
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileUpload | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  const fetchFiles = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const data = await api.getFiles({
        page,
        limit: 12,
        q: searchQuery || undefined,
      });
      setFiles(data.items);
      setMeta(data.meta);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === "library") {
      fetchFiles(1);
      setCurrentPage(1);
    }
  }, [open, activeTab, searchQuery]);

  const handleSelectFile = (file: FileUpload) => {
    setSelectedFile(file);
  };

  const handleConfirmSelection = () => {
    if (selectedFile) {
      onChange(selectedFile);
      setOpen(false);
      setSelectedFile(null);
    }
  };

  const handleUpload = async (uploadFiles: File[]) => {
    return api.uploadFiles(uploadFiles);
  };

  const handleUploadComplete = () => {
    // Switch to library tab and refresh
    setActiveTab("library");
    fetchFiles(1);
  };

  const handleRemove = () => {
    onChange(null);
  };

  const handleOpenDialog = () => {
    setSelectedFile(null);
    setOpen(true);
  };

  const IconComponent = value ? getFileIcon(value) : File;

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          {isImageFile(value) ? (
            <img
              src={`${apiBaseUrl}/files/${value.id}/thumbnail`}
              alt={value.altText || value.originalName}
              className="w-12 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
              <IconComponent className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.originalName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.sizeBytes)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenDialog}
            >
              Change
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleOpenDialog}
        >
          <FolderOpen className="h-4 w-4" />
          Select from Media Library
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select File</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "library" | "upload")} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Media Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="flex-1 flex flex-col mt-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* File grid */}
              <div className="flex-1 overflow-auto border rounded-lg p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <File className="h-12 w-12 mb-2" />
                    <p>No files found</p>
                    <p className="text-sm">Upload files to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {files.map((file) => {
                      const isSelected = selectedFile?.id === file.id;
                      const FileIcon = getFileIcon(file);

                      return (
                        <div
                          key={file.id}
                          className={cn(
                            "group relative flex flex-col items-center p-2 rounded-lg border cursor-pointer hover:border-primary transition-colors",
                            isSelected && "border-primary bg-primary/10 ring-2 ring-primary"
                          )}
                          onClick={() => handleSelectFile(file)}
                        >
                          <div className="w-full aspect-square flex items-center justify-center bg-muted rounded-md overflow-hidden mb-1">
                            {isImageFile(file) ? (
                              <img
                                src={`${apiBaseUrl}/files/${file.id}/thumbnail`}
                                alt={file.altText || file.originalName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileIcon className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-center truncate w-full" title={file.originalName}>
                            {file.originalName}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {meta.currentPage} of {meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage(currentPage - 1);
                        fetchFiles(currentPage - 1);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === meta.totalPages}
                      onClick={() => {
                        setCurrentPage(currentPage + 1);
                        fetchFiles(currentPage + 1);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Select button */}
              <div className="flex justify-end mt-4 pt-4 border-t">
                <Button
                  type="button"
                  disabled={!selectedFile}
                  onClick={handleConfirmSelection}
                >
                  Select File
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="flex-1 mt-4">
              <UploadDropzone
                onUpload={handleUpload}
                onUploadComplete={handleUploadComplete}
              />
              <p className="text-xs text-muted-foreground text-center mt-4">
                After uploading, switch to the Media Library tab to select your file.
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
