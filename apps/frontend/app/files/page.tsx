"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { FolderTree } from "@/components/files/folder-tree";
import { FileGrid } from "@/components/files/file-grid";
import { FileDetails } from "@/components/files/file-details";
import { UploadDropzone } from "@/components/files/upload-dropzone";
import { ImageEditor } from "@/components/files/image-editor";
import { FileUpload, Folder } from "@/components/files/types";
import { toast } from "sonner";
import {
  FolderIcon,
  Search,
  Upload,
  Database,
} from "lucide-react";
import axios from "axios";
import api from "@/lib/api-sdk";

type MimeGroup = "image" | "video" | "audio" | "pdf" | "doc" | "other" | "";

type PaginationMeta = {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
};

type PaginatedResponse = {
  items: FileUpload[];
  meta: PaginationMeta;
};

const ITEMS_PER_PAGE = 24;

const FilesPage = () => {
  // Folders
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Files
  const [filesData, setFilesData] = useState<PaginatedResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileUpload | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [mimeGroupFilter, setMimeGroupFilter] = useState<MimeGroup>("");

  // Upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false);

  // Delete state
  const [deletingFile, setDeletingFile] = useState<FileUpload | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Folder delete state
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  const fetchFolders = async () => {
    try {
      const data = await api.getFoldersTree();
      setFolders(data);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const fetchFiles = async (page: number = currentPage) => {
    try {
      const data = await api.getFiles({
        page,
        limit: ITEMS_PER_PAGE,
        folderId: selectedFolderId,
        q: searchQuery || undefined,
        mimeGroup: mimeGroupFilter || undefined,
      });
      setFilesData(data);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchFolders();
      await fetchFiles(1);
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchFiles(1);
  }, [selectedFolderId, searchQuery, mimeGroupFilter]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchFiles(currentPage);
    }
  }, [currentPage]);

  // Folder handlers
  const handleCreateFolder = async (name: string, parentId?: string) => {
    try {
      await api.createFolder({ name, parentId });
      toast.success("Folder created successfully.");
      fetchFolders();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create folder.");
      }
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    try {
      await api.updateFolder(id, { name });
      toast.success("Folder renamed successfully.");
      fetchFolders();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to rename folder.");
      }
    }
  };

  const handleDeleteFolderClick = (folder: Folder) => {
    setDeletingFolder(folder);
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;

    try {
      setIsDeletingFolder(true);
      await api.deleteFolder(deletingFolder.id);
      toast.success("Folder deleted successfully.");
      if (selectedFolderId === deletingFolder.id) {
        setSelectedFolderId(null);
      }
      fetchFolders();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete folder.");
      }
    } finally {
      setIsDeletingFolder(false);
      setDeletingFolder(null);
    }
  };

  // File handlers
  const handleSelectFile = (file: FileUpload) => {
    setSelectedFile(file);
  };

  const handleUpload = async (files: File[]) => {
    return api.uploadFiles(files, selectedFolderId || undefined);
  };

  const handleUploadComplete = () => {
    fetchFiles(currentPage);
    setShowUploadDialog(false);
    toast.success("Files uploaded successfully.");
  };

  const handleUpdateFile = async (data: { altText?: string | null; caption?: string | null }) => {
    if (!selectedFile) return;

    try {
      const updatedFile = await api.updateFile(selectedFile.id, data);
      setSelectedFile(updatedFile);
      fetchFiles(currentPage);
      toast.success("File metadata updated.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update file.");
      }
    }
  };

  const handleMoveFile = async (folderId: string | null) => {
    if (!selectedFile) return;

    try {
      const updatedFile = await api.moveFile(selectedFile.id, folderId);
      setSelectedFile(updatedFile);
      fetchFiles(currentPage);
      toast.success("File moved successfully.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to move file.");
      }
    }
  };

  const handleDeleteFileClick = () => {
    if (selectedFile) {
      setDeletingFile(selectedFile);
    }
  };

  const handleDeleteFile = async () => {
    if (!deletingFile) return;

    try {
      setIsDeleting(true);
      await api.deleteFile(deletingFile.id);
      toast.success("File deleted successfully.");
      if (selectedFile?.id === deletingFile.id) {
        setSelectedFile(null);
      }
      if (filesData && filesData.items.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchFiles(currentPage);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete file.");
      }
    } finally {
      setIsDeleting(false);
      setDeletingFile(null);
    }
  };

  // Image editing handlers
  const handleCrop = async (data: { x: number; y: number; width: number; height: number }) => {
    if (!selectedFile) return;

    try {
      const newFile = await api.cropImage(selectedFile.id, data);
      toast.success("Image cropped successfully. New file created.");
      setSelectedFile(newFile);
      fetchFiles(currentPage);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to crop image.");
      }
    }
  };

  const handleResize = async (data: { width?: number; height?: number; keepAspectRatio?: boolean }) => {
    if (!selectedFile) return;

    try {
      const newFile = await api.resizeImage(selectedFile.id, data);
      toast.success("Image resized successfully. New file created.");
      setSelectedFile(newFile);
      fetchFiles(currentPage);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to resize image.");
      }
    }
  };

  const handleGrayscale = async () => {
    if (!selectedFile) return;

    try {
      const newFile = await api.grayscaleImage(selectedFile.id);
      toast.success("Image converted to grayscale. New file created.");
      setSelectedFile(newFile);
      fetchFiles(currentPage);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to convert image to grayscale.");
      }
    }
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedFiles();
      toast.success(`Seeded ${result.inserted} files (${result.skipped} skipped).`);
      fetchFolders();
      fetchFiles(1);
      setCurrentPage(1);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to seed files.");
      }
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoading) return <MarketlumDefaultSkeleton />;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderIcon className="h-6 w-6" />
          MEDIA LIBRARY
        </h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Seeding..." : "Seed Sample Data"}
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={mimeGroupFilter || "_all"}
          onValueChange={(v) => setMimeGroupFilter(v === "_all" ? "" : (v as MimeGroup))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="File Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
            <SelectItem value="doc">Documents</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main content */}
      <div className="flex flex-1 border rounded-lg overflow-hidden">
        {/* Folder sidebar */}
        <div className="w-60 border-r bg-muted/30">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolderClick}
          />
        </div>

        {/* File grid */}
        <div className="flex-1">
          <FileGrid
            files={filesData?.items || []}
            selectedFileId={selectedFile?.id || null}
            onSelectFile={handleSelectFile}
            currentPage={filesData?.meta.currentPage || 1}
            totalPages={filesData?.meta.totalPages || 1}
            totalItems={filesData?.meta.totalItems || 0}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            apiBaseUrl={apiBaseUrl}
          />
        </div>

        {/* File details panel */}
        {selectedFile && (
          <div className="w-80">
            <FileDetails
              file={selectedFile}
              folders={folders}
              apiBaseUrl={apiBaseUrl}
              onUpdate={handleUpdateFile}
              onMove={handleMoveFile}
              onDelete={handleDeleteFileClick}
              onEditImage={() => setShowImageEditor(true)}
              onClose={() => setSelectedFile(null)}
            />
          </div>
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <UploadDropzone
            onUpload={handleUpload}
            onUploadComplete={handleUploadComplete}
          />
        </DialogContent>
      </Dialog>

      {/* Image editor dialog */}
      {selectedFile && (
        <ImageEditor
          file={selectedFile}
          apiBaseUrl={apiBaseUrl}
          open={showImageEditor}
          onOpenChange={setShowImageEditor}
          onCrop={handleCrop}
          onResize={handleResize}
          onGrayscale={handleGrayscale}
        />
      )}

      {/* Delete file confirmation */}
      <AlertDialog open={!!deletingFile} onOpenChange={() => setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingFile?.originalName}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete folder confirmation */}
      <AlertDialog open={!!deletingFolder} onOpenChange={() => setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the folder &quot;{deletingFolder?.name}&quot;?
              {deletingFolder?.children && deletingFolder.children.length > 0 ? (
                <span className="block mt-2 text-destructive font-medium">
                  This folder has subfolders and cannot be deleted. Delete subfolders first.
                </span>
              ) : (
                " Files in this folder will be moved to the root."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              disabled={
                isDeletingFolder ||
                (deletingFolder?.children && deletingFolder.children.length > 0)
              }
            >
              {isDeletingFolder ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FilesPage;
