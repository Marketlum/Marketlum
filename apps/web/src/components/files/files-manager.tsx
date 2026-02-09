'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Upload,
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  FileIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { FolderTreeNode, FileResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// --- Folder Tree Node ---
interface FolderNodeProps {
  node: FolderTreeNode;
  depth: number;
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onCreateChild: (parentId: string, name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string, name: string) => void;
  isMobile: boolean;
}

function FolderNode({
  node,
  depth,
  selectedFolderId,
  onSelect,
  onCreateChild,
  onRename,
  onDelete,
  isMobile,
}: FolderNodeProps) {
  const t = useTranslations('files');
  const tc = useTranslations('common');
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFolderId === node.id;

  const handleSaveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === node.name) {
      setEditing(false);
      setEditName(node.name);
      return;
    }
    await onRename(node.id, trimmed);
    setEditing(false);
  };

  const handleCreateChild = async () => {
    if (!newChildName.trim()) return;
    await onCreateChild(node.id, newChildName.trim());
    setNewChildName('');
    setAddingChild(false);
    setExpanded(true);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-1 py-1 cursor-pointer ${
          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/50'
        }`}
        style={{ paddingLeft: depth * (isMobile ? 12 : 20) + 4 }}
        onClick={() => onSelect(node.id)}
      >
        <button
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-secondary"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {hasChildren ? (
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
        </button>

        {expanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        {editing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') {
                setEditing(false);
                setEditName(node.name);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="mx-1 h-6 flex-1 text-xs"
            autoFocus
          />
        ) : (
          <span className="mx-1 flex-1 truncate text-sm">{node.name}</span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setAddingChild(true);
                setExpanded(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('addChildFolder')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditName(node.name);
                setEditing(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {t('rename')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(node.id, node.name)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tc('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {addingChild && (
        <div
          className="flex items-center gap-1 py-1"
          style={{ paddingLeft: (depth + 1) * (isMobile ? 12 : 20) + 4 }}
        >
          <span className="h-6 w-6" />
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateChild();
              if (e.key === 'Escape') {
                setAddingChild(false);
                setNewChildName('');
              }
            }}
            placeholder={t('childFolderNamePlaceholder')}
            className="mx-1 h-6 flex-1 text-xs"
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={handleCreateChild}>
            {tc('save')}
          </Button>
        </div>
      )}
    </div>
  );
}

// --- Main Files Manager ---
export function FilesManager() {
  const t = useTranslations('files');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();

  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [files, setFiles] = useState<PaginatedResponse<FileResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(true);
  const [page, setPage] = useState(1);

  // Folder actions
  const [addingRootFolder, setAddingRootFolder] = useState(false);
  const [newRootFolderName, setNewRootFolderName] = useState('');

  // Delete states
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename file state
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<FolderTreeNode[]>('/folders/tree');
      setTree(data);
    } catch {
      toast.error(t('failedToLoadFolders'));
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (selectedFolderId) {
        params.set('folderId', selectedFolderId);
      } else if (!showAllFiles) {
        params.set('root', 'true');
      }
      const data = await api.get<PaginatedResponse<FileResponse>>(`/files?${params}`);
      setFiles(data);
    } catch {
      toast.error(t('failedToLoadFiles'));
    }
  }, [page, selectedFolderId, showAllFiles]);

  useEffect(() => {
    Promise.all([fetchTree(), fetchFiles()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Reset page on folder change
  useEffect(() => {
    setPage(1);
  }, [selectedFolderId, showAllFiles]);

  const handleSelectFolder = (id: string | null) => {
    if (id === selectedFolderId) {
      setSelectedFolderId(null);
      setShowAllFiles(true);
    } else {
      setSelectedFolderId(id);
      setShowAllFiles(false);
    }
  };

  const handleCreateRootFolder = async () => {
    if (!newRootFolderName.trim()) return;
    try {
      await api.post('/folders', { name: newRootFolderName.trim() });
      toast.success(t('folderCreated'));
      setNewRootFolderName('');
      setAddingRootFolder(false);
      fetchTree();
    } catch {
      toast.error(t('failedToCreateFolder'));
    }
  };

  const handleCreateChildFolder = async (parentId: string, name: string) => {
    try {
      await api.post('/folders', { name, parentId });
      toast.success(t('folderCreated'));
      fetchTree();
    } catch {
      toast.error(t('failedToCreateFolder'));
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    try {
      await api.patch(`/folders/${id}`, { name });
      toast.success(t('folderRenamed'));
      fetchTree();
    } catch {
      toast.error(t('failedToRenameFolder'));
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/folders/${deleteFolderTarget.id}`);
      toast.success(t('folderDeleted'));
      if (selectedFolderId === deleteFolderTarget.id) {
        setSelectedFolderId(null);
        setShowAllFiles(true);
      }
      setDeleteFolderTarget(null);
      fetchTree();
      fetchFiles();
    } catch {
      toast.error(t('failedToDeleteFolder'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (selectedFolderId) {
      formData.append('folderId', selectedFolderId);
    }

    try {
      await api.upload('/files/upload', formData);
      toast.success(t('fileUploaded'));
      fetchFiles();
    } catch {
      toast.error(t('failedToUpload'));
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`${API_URL}/files/${fileId}/download`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('failedToDownload'));
    }
  };

  const handleRenameFile = async (id: string, name: string) => {
    try {
      await api.patch(`/files/${id}`, { originalName: name });
      toast.success(t('fileRenamed'));
      setRenamingFileId(null);
      fetchFiles();
    } catch {
      toast.error(t('failedToRename'));
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFileTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/files/${deleteFileTarget.id}`);
      toast.success(t('fileDeleted'));
      setDeleteFileTarget(null);
      fetchFiles();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Folder sidebar */}
      <div className="w-full md:w-72 shrink-0">
        <div className="rounded-md border p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-sm font-medium">{t('folders')}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => setAddingRootFolder(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* "All files" option */}
          <div
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm ${
              showAllFiles && !selectedFolderId
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-secondary/50 text-muted-foreground'
            }`}
            onClick={() => {
              setSelectedFolderId(null);
              setShowAllFiles(true);
            }}
          >
            <FileIcon className="h-4 w-4 shrink-0" />
            {t('allFiles')}
          </div>

          {/* Root files option */}
          <div
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm ${
              !showAllFiles && !selectedFolderId
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-secondary/50 text-muted-foreground'
            }`}
            onClick={() => {
              setSelectedFolderId(null);
              setShowAllFiles(false);
            }}
          >
            <FileIcon className="h-4 w-4 shrink-0" />
            {t('rootFiles')}
          </div>

          <div className="my-1 border-t" />

          {addingRootFolder && (
            <div className="flex items-center gap-1 px-1 py-1">
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground ml-7" />
              <Input
                value={newRootFolderName}
                onChange={(e) => setNewRootFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateRootFolder();
                  if (e.key === 'Escape') {
                    setAddingRootFolder(false);
                    setNewRootFolderName('');
                  }
                }}
                placeholder={t('folderNamePlaceholder')}
                className="mx-1 h-6 flex-1 text-xs"
                autoFocus
              />
            </div>
          )}

          {tree.map((node) => (
            <FolderNode
              key={node.id}
              node={node}
              depth={0}
              selectedFolderId={selectedFolderId}
              onSelect={handleSelectFolder}
              onCreateChild={handleCreateChildFolder}
              onRename={handleRenameFolder}
              onDelete={(id, name) => setDeleteFolderTarget({ id, name })}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {t('upload')}
          </Button>
        </div>

        {files && files.data.length > 0 ? (
          <>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">{tc('name')}</th>
                    <th className="hidden md:table-cell px-3 py-2 text-left font-medium">{t('type')}</th>
                    <th className="hidden md:table-cell px-3 py-2 text-left font-medium">{t('size')}</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {files.data.map((file) => (
                    <tr key={file.id} className="border-b last:border-0 hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        {renamingFileId === file.id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFile(file.id, renameValue);
                              if (e.key === 'Escape') setRenamingFileId(null);
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{file.originalName}</span>
                          </div>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 text-muted-foreground">
                        {file.mimeType}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 text-muted-foreground">
                        {formatFileSize(Number(file.size))}
                      </td>
                      <td className="px-3 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDownload(file.id, file.originalName)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              {t('download')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setRenamingFileId(file.id);
                                setRenameValue(file.originalName);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t('rename')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteFileTarget({ id: file.id, name: file.originalName })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {tc('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {files.meta.totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>{tc('totalRows', { total: files.meta.total })}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    &lt;
                  </Button>
                  <span>{tc('pageOf', { page: files.meta.page, totalPages: files.meta.totalPages })}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= files.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    &gt;
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            {selectedFolderId ? t('emptyFolder') : t('emptyState')}
          </div>
        )}
      </div>

      {/* Delete folder dialog */}
      <ConfirmDeleteDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
        onConfirm={handleDeleteFolder}
        title={t('deleteFolder')}
        description={t('deleteWithChildren', { name: deleteFolderTarget?.name ?? '' })}
        isDeleting={isDeleting}
      />

      {/* Delete file dialog */}
      <ConfirmDeleteDialog
        open={!!deleteFileTarget}
        onOpenChange={(open) => !open && setDeleteFileTarget(null)}
        onConfirm={handleDeleteFile}
        title={t('deleteFile')}
        description={t('confirmDeleteFile', { name: deleteFileTarget?.name ?? '' })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
