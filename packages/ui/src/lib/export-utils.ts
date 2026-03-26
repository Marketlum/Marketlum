export interface FieldDef {
  key: string;
  label: string;
  extract: (row: Record<string, unknown>) => string;
}

export type ExportFormat = 'csv' | 'json' | 'xml' | 'markdown';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeXML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function extractRows(rows: Record<string, unknown>[], fields: FieldDef[]): string[][] {
  return rows.map((row) => fields.map((f) => f.extract(row)));
}

export function toCsv(rows: Record<string, unknown>[], fields: FieldDef[]): string {
  const header = fields.map((f) => escapeCSV(f.label)).join(',');
  const dataRows = extractRows(rows, fields).map((row) =>
    row.map((cell) => escapeCSV(cell)).join(','),
  );
  return [header, ...dataRows].join('\n');
}

export function toJson(rows: Record<string, unknown>[], fields: FieldDef[]): string {
  const objects = rows.map((row) => {
    const obj: Record<string, string> = {};
    for (const f of fields) {
      obj[f.label] = f.extract(row);
    }
    return obj;
  });
  return JSON.stringify(objects, null, 2);
}

export function toXml(rows: Record<string, unknown>[], fields: FieldDef[]): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<records>'];
  for (const row of rows) {
    lines.push('  <record>');
    for (const f of fields) {
      const tag = f.key.replace(/[^a-zA-Z0-9]/g, '_');
      lines.push(`    <${tag}>${escapeXML(f.extract(row))}</${tag}>`);
    }
    lines.push('  </record>');
  }
  lines.push('</records>');
  return lines.join('\n');
}

export function toMarkdown(rows: Record<string, unknown>[], fields: FieldDef[]): string {
  const header = '| ' + fields.map((f) => escapeMarkdown(f.label)).join(' | ') + ' |';
  const separator = '| ' + fields.map(() => '---').join(' | ') + ' |';
  const dataRows = extractRows(rows, fields).map(
    (row) => '| ' + row.map((cell) => escapeMarkdown(cell)).join(' | ') + ' |',
  );
  return [header, separator, ...dataRows].join('\n');
}

const formatConverters: Record<
  ExportFormat,
  (rows: Record<string, unknown>[], fields: FieldDef[]) => string
> = {
  csv: toCsv,
  json: toJson,
  xml: toXml,
  markdown: toMarkdown,
};

const mimeTypes: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8;',
  json: 'application/json;charset=utf-8;',
  xml: 'application/xml;charset=utf-8;',
  markdown: 'text/markdown;charset=utf-8;',
};

const fileExtensions: Record<ExportFormat, string> = {
  csv: 'csv',
  json: 'json',
  xml: 'xml',
  markdown: 'md',
};

export function exportData(
  rows: Record<string, unknown>[],
  fields: FieldDef[],
  format: ExportFormat,
  filenameBase: string,
): void {
  const content = formatConverters[format](rows, fields);
  const blob = new Blob([content], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}.${fileExtensions[format]}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
