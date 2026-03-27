export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getPresetRange(key: string): { from: string; to: string } {
  const today = new Date();
  const to = formatDate(today);

  switch (key) {
    case 'last7': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { from: formatDate(d), to };
    }
    case 'last30': {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { from: formatDate(d), to };
    }
    case 'thisMonth': {
      return { from: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), to };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: formatDate(start), to: formatDate(end) };
    }
    case 'thisQuarter': {
      const q = Math.floor(today.getMonth() / 3);
      return { from: formatDate(new Date(today.getFullYear(), q * 3, 1)), to };
    }
    case 'thisYear': {
      return { from: formatDate(new Date(today.getFullYear(), 0, 1)), to };
    }
    case 'lastYear': {
      return {
        from: formatDate(new Date(today.getFullYear() - 1, 0, 1)),
        to: formatDate(new Date(today.getFullYear() - 1, 11, 31)),
      };
    }
    default:
      return { from: '', to: '' };
  }
}
