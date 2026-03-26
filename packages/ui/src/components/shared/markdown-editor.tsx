'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  rows?: number;
}

export function MarkdownEditor({ value, onChange, id, rows = 5 }: MarkdownEditorProps) {
  const [tab, setTab] = useState<string>('write');

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="h-8">
        <TabsTrigger value="write" className="text-xs px-3 py-1">Write</TabsTrigger>
        <TabsTrigger value="preview" className="text-xs px-3 py-1">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write" className="mt-2">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-2">
        <div className="min-h-[5rem] rounded-md border px-3 py-2">
          {value ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className ?? ''}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
