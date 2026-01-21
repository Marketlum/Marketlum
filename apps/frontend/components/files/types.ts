export type FileUpload = {
  id: string;
  folderId: string | null;
  folder?: Folder | null;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  checksum: string | null;
  storageProvider: 'local' | 's3';
  storageKey: string;
  thumbnailKey: string | null;
  altText: string | null;
  caption: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  children?: Folder[];
  createdAt: string;
  updatedAt: string;
};

export type MimeGroup = 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'other';

export const MIME_GROUP_OPTIONS: Array<{ value: MimeGroup; label: string }> = [
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'doc', label: 'Documents' },
  { value: 'other', label: 'Other' },
];

export const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Newest First' },
  { value: 'createdAt_asc', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'size_desc', label: 'Largest First' },
  { value: 'size_asc', label: 'Smallest First' },
];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function isImageFile(file: FileUpload): boolean {
  return file.mimeType.startsWith('image/');
}

export function isVideoFile(file: FileUpload): boolean {
  return file.mimeType.startsWith('video/');
}

export function isAudioFile(file: FileUpload): boolean {
  return file.mimeType.startsWith('audio/');
}

export function isPdfFile(file: FileUpload): boolean {
  return file.mimeType === 'application/pdf';
}

export function getFileIcon(file: FileUpload): string {
  if (isImageFile(file)) return 'image';
  if (isVideoFile(file)) return 'video';
  if (isAudioFile(file)) return 'audio';
  if (isPdfFile(file)) return 'pdf';
  return 'file';
}
