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

export function mergeColumnVisibility(
  perspectiveVisibility: Record<string, boolean>,
  mobileVisibility: Record<string, boolean>,
): Record<string, boolean> {
  const merged = { ...perspectiveVisibility };
  for (const [key, value] of Object.entries(mobileVisibility)) {
    if (value === false) merged[key] = false;
  }
  return merged;
}
