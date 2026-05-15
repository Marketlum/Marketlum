'use client';

import * as React from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface CodeBadgeProps extends React.HTMLAttributes<HTMLButtonElement> {
  code: string;
}

export function CodeBadge({ code, className, ...props }: CodeBadgeProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
      title="Click to copy"
      {...props}
    >
      <span>{code}</span>
      <Copy className="h-3 w-3 opacity-60" />
    </button>
  );
}
