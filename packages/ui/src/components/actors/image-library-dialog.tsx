'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import type { FileResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { FileImagePreview } from '../shared/file-image-preview';

interface ImageLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: FileResponse) => void;
}

export function ImageLibraryDialog({ open, onOpenChange, onSelect }: ImageLibraryDialogProps) {
  const t = useTranslations('agents');
  const tc = useTranslations('common');
  const [files, setFiles] = useState<FileResponse[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      const result = await api.get<PaginatedResponse<FileResponse>>(`/files?${params}`);
      setFiles(result.data);
      setTotalPages(result.meta.totalPages);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open, fetchFiles]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('selectFromLibrary')}</DialogTitle>
          <DialogDescription>{t('selectImageDescription')}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc('search')}
            className="pl-8"
          />
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            {tc('loading')}
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            {tc('noResults')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className="flex flex-col rounded-lg border bg-card overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                  onClick={() => {
                    onSelect(file);
                    onOpenChange(false);
                  }}
                >
                  <div className="aspect-square flex items-center justify-center bg-muted/30">
                    <FileImagePreview fileId={file.id} mimeType={file.mimeType} alt={file.originalName} />
                  </div>
                  <div className="p-1.5">
                    <p className="truncate text-xs">{file.originalName}</p>
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  &lt;
                </Button>
                <span className="text-sm text-muted-foreground">
                  {tc('pageOf', { page, totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  &gt;
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
