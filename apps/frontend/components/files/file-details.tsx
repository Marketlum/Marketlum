"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Trash2,
  Crop,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  File,
  X,
} from "lucide-react";
import { FileUpload, Folder, formatFileSize, isImageFile, isVideoFile, isAudioFile, isPdfFile } from "./types";
import { format } from "date-fns";

type FileDetailsProps = {
  file: FileUpload;
  folders: Folder[];
  apiBaseUrl: string;
  onUpdate: (data: { altText?: string | null; caption?: string | null }) => Promise<void>;
  onMove: (folderId: string | null) => Promise<void>;
  onDelete: () => void;
  onEditImage: () => void;
  onClose: () => void;
};

function flattenFolders(
  folders: Folder[],
  depth = 0
): Array<{ id: string; name: string; depth: number }> {
  const result: Array<{ id: string; name: string; depth: number }> = [];
  for (const folder of folders) {
    result.push({ id: folder.id, name: folder.name, depth });
    if (folder.children && folder.children.length > 0) {
      result.push(...flattenFolders(folder.children, depth + 1));
    }
  }
  return result;
}

function getFileIcon(file: FileUpload) {
  if (file.mimeType.startsWith("image/")) return ImageIcon;
  if (file.mimeType.startsWith("video/")) return Video;
  if (file.mimeType.startsWith("audio/")) return Music;
  if (file.mimeType === "application/pdf") return FileText;
  return File;
}

export function FileDetails({
  file,
  folders,
  apiBaseUrl,
  onUpdate,
  onMove,
  onDelete,
  onEditImage,
  onClose,
}: FileDetailsProps) {
  const [altText, setAltText] = useState(file.altText || "");
  const [caption, setCaption] = useState(file.caption || "");
  const [isSaving, setIsSaving] = useState(false);

  const flatFolders = flattenFolders(folders);
  const IconComponent = getFileIcon(file);

  const handleSaveMetadata = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        altText: altText || null,
        caption: caption || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveFolder = async (folderId: string) => {
    await onMove(folderId === "_root" ? null : folderId);
  };

  return (
    <div className="flex flex-col h-full border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-semibold text-sm">File Details</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Preview */}
        <div className="w-full aspect-video flex items-center justify-center bg-muted rounded-lg overflow-hidden">
          {isImageFile(file) ? (
            <img
              src={`${apiBaseUrl}/files/${file.id}/preview`}
              alt={file.altText || file.originalName}
              className="max-w-full max-h-full object-contain"
            />
          ) : isVideoFile(file) ? (
            <video
              src={`${apiBaseUrl}/files/${file.id}/preview`}
              controls
              className="max-w-full max-h-full"
            />
          ) : isAudioFile(file) ? (
            <div className="flex flex-col items-center gap-4 p-4">
              <Music className="h-16 w-16 text-muted-foreground" />
              <audio
                src={`${apiBaseUrl}/files/${file.id}/preview`}
                controls
                className="w-full"
              />
            </div>
          ) : isPdfFile(file) ? (
            <iframe
              src={`${apiBaseUrl}/files/${file.id}/preview`}
              className="w-full h-full"
              title={file.originalName}
            />
          ) : (
            <IconComponent className="h-16 w-16 text-muted-foreground" />
          )}
        </div>

        {/* Filename */}
        <div>
          <Label className="text-xs text-muted-foreground">Filename</Label>
          <p className="text-sm font-medium break-all">{file.originalName}</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <p>{file.mimeType}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Size</Label>
            <p>{formatFileSize(file.sizeBytes)}</p>
          </div>
          {file.width && file.height && (
            <div>
              <Label className="text-xs text-muted-foreground">Dimensions</Label>
              <p>
                {file.width} x {file.height}
              </p>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Uploaded</Label>
            <p>{format(new Date(file.createdAt), "MMM d, yyyy")}</p>
          </div>
        </div>

        {/* Alt Text */}
        <div>
          <Label htmlFor="altText" className="text-xs">
            Alt Text
          </Label>
          <Input
            id="altText"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe this file..."
            className="mt-1"
          />
        </div>

        {/* Caption */}
        <div>
          <Label htmlFor="caption" className="text-xs">
            Caption
          </Label>
          <Input
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="mt-1"
          />
        </div>

        {/* Save metadata */}
        <Button
          onClick={handleSaveMetadata}
          disabled={isSaving}
          className="w-full"
          variant="outline"
        >
          {isSaving ? "Saving..." : "Save Metadata"}
        </Button>

        {/* Move to folder */}
        <div>
          <Label className="text-xs">Move to Folder</Label>
          <Select
            value={file.folderId || "_root"}
            onValueChange={handleMoveFolder}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_root">Root (No folder)</SelectItem>
              {flatFolders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  <span style={{ paddingLeft: `${folder.depth * 12}px` }}>
                    {folder.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <a
            href={`${apiBaseUrl}/files/${file.id}/download`}
            download={file.originalName}
            className="w-full"
          >
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </a>

          {isImageFile(file) && (
            <Button variant="outline" className="w-full" onClick={onEditImage}>
              <Crop className="mr-2 h-4 w-4" />
              Edit Image
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
