'use client';

import { Lightbulb, FlaskConical, TestTubeDiagonal, ShieldCheck, Archive } from 'lucide-react';
import { Badge } from '../ui/badge';

const lifecycleConfig: Record<string, { icon: typeof Lightbulb; className: string }> = {
  idea: {
    icon: Lightbulb,
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  alpha: {
    icon: FlaskConical,
    className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300',
  },
  beta: {
    icon: TestTubeDiagonal,
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
  },
  stable: {
    icon: ShieldCheck,
    className: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  },
  legacy: {
    icon: Archive,
    className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300',
  },
};

interface ValueLifecycleBadgeProps {
  stage: string;
  label: string;
}

export function ValueLifecycleBadge({ stage, label }: ValueLifecycleBadgeProps) {
  const config = lifecycleConfig[stage];
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
