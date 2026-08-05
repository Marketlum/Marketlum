'use client';

import { Building2, User, Bot } from 'lucide-react';
import { Badge } from '../ui/badge';

const agentTypeConfig: Record<string, { icon: typeof Building2; className: string }> = {
  organization: {
    icon: Building2,
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  individual: {
    icon: User,
    className: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  },
  virtual: {
    icon: Bot,
    className: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
  },
};

interface AgentTypeBadgeProps {
  type: string;
  label: string;
}

export function AgentTypeBadge({ type, label }: AgentTypeBadgeProps) {
  const config = agentTypeConfig[type];
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
