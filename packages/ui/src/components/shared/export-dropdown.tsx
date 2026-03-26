'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { type FieldDef, type ExportFormat, exportData } from '../../lib/export-utils';

interface ExportDropdownProps {
  visibleData: Record<string, unknown>[];
  fetchAllData: () => Promise<Record<string, unknown>[]>;
  fields: FieldDef[];
  visibleFields: FieldDef[];
  filenameBase: string;
}

const formats: { key: ExportFormat; labelKey: string }[] = [
  { key: 'csv', labelKey: 'csv' },
  { key: 'json', labelKey: 'json' },
  { key: 'xml', labelKey: 'xml' },
  { key: 'markdown', labelKey: 'markdown' },
];

export function ExportDropdown({
  visibleData,
  fetchAllData,
  fields,
  visibleFields,
  filenameBase,
}: ExportDropdownProps) {
  const t = useTranslations('export');
  const [exporting, setExporting] = useState(false);

  const handleExportVisible = (format: ExportFormat) => {
    try {
      exportData(visibleData, visibleFields, format, `${filenameBase}-visible`);
      toast.success(t('exported'));
    } catch {
      toast.error(t('failedToExport'));
    }
  };

  const handleExportAll = async (format: ExportFormat) => {
    setExporting(true);
    toast.info(t('exporting'));
    try {
      const allData = await fetchAllData();
      exportData(allData, fields, format, filenameBase);
      toast.success(t('exported'));
    } catch {
      toast.error(t('failedToExport'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {t('export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('exportVisible')}</DropdownMenuLabel>
        {formats.map((f) => (
          <DropdownMenuItem key={`visible-${f.key}`} onClick={() => handleExportVisible(f.key)}>
            {t(f.labelKey)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('exportAll')}</DropdownMenuLabel>
        {formats.map((f) => (
          <DropdownMenuItem key={`all-${f.key}`} onClick={() => handleExportAll(f.key)}>
            {t(f.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
