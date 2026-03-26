'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileIcon,
  FileText,
  FileVideo,
  FileAudio,
  FileArchive,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('rar'))
    return FileArchive;
  return FileIcon;
}

interface FileImagePreviewProps {
  fileId: string;
  mimeType: string;
  alt: string;
  iconClassName?: string;
  imgClassName?: string;
}

export function FileImagePreview({ fileId, mimeType, alt, iconClassName, imgClassName }: FileImagePreviewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isImageMimeType(mimeType)) return;

    let cancelled = false;
    fetch(`${API_URL}/files/${fileId}/download`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setSrc(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [fileId, mimeType]);

  if (!src) {
    const Icon = getFileIcon(mimeType);
    return <Icon className={iconClassName ?? 'h-12 w-12 text-muted-foreground/50'} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={imgClassName ?? 'h-full w-full object-cover'} />;
}
