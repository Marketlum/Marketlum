'use client';

import { Package, Wrench, Heart, Scale } from 'lucide-react';
import { Badge } from '../ui/badge';

const valueTypeConfig: Record<string, { icon: typeof Package; className: string }> = {
  product: {
    icon: Package,
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  service: {
    icon: Wrench,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  },
  relationship: {
    icon: Heart,
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  },
  right: {
    icon: Scale,
    className: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
  },
};

interface ValueTypeBadgeProps {
  type: string;
  label: string;
}

export function ValueTypeBadge({ type, label }: ValueTypeBadgeProps) {
  const config = valueTypeConfig[type];
  if (!config) {
    return <Badge variant="secondary">{label}</Badge>;
  }

  const Icon = config.icon;
  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}
