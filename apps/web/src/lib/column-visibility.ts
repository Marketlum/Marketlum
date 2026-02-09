import type { ColumnDef } from '@tanstack/react-table';

export function getMobileColumnVisibility<TData>(
  columns: ColumnDef<TData, unknown>[],
  isMobile: boolean,
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};
  if (!isMobile) return visibility;

  for (const col of columns) {
    const key = (col as { accessorKey?: string }).accessorKey ?? (col as { id?: string }).id;
    if (key && (col.meta as { hideOnMobile?: boolean })?.hideOnMobile) {
      visibility[key] = false;
    }
  }

  return visibility;
}
