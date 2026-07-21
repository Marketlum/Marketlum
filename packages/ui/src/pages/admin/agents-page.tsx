'use client';

import Link from 'next/link';
import { Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AgentsDataTable } from '../../components/agents/agents-data-table';
import { AgentTreeView } from '../../components/agents/agent-tree-view';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export function AgentsPage() {
  const t = useTranslations();

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">{t('common.home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('agents.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <Bot className="h-6 w-6 md:h-8 md:w-8" />
        {t('agents.title')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('agents.description')}</p>

      <Tabs defaultValue="table">
        <TabsList className="mb-4">
          <TabsTrigger value="table">{t('agents.tableView')}</TabsTrigger>
          <TabsTrigger value="tree">{t('agents.treeView')}</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <AgentsDataTable />
        </TabsContent>
        <TabsContent value="tree">
          <AgentTreeView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
