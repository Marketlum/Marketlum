'use client';

import { Bot, User } from 'lucide-react';
import { Badge } from '../ui/badge';

const userTypeConfig: Record<string, { icon: typeof User; className: string }> = {
  human: {
    icon: User,
    className:
      'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  },
  agent: {
    icon: Bot,
    className:
      'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
  },
};

interface UserTypeBadgeProps {
  type: string;
  label: string;
}

export function UserTypeBadge({ type, label }: UserTypeBadgeProps) {
  const config = userTypeConfig[type];
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
