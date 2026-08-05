'use client';

import Link from 'next/link';
import { Drama } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ActorsDataTable } from '../../components/actors/actors-data-table';
import { ActorTreeView } from '../../components/actors/actor-tree-view';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export function ActorsPage() {
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
            <BreadcrumbPage>{t('actors.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <Drama className="h-6 w-6 md:h-8 md:w-8" />
        {t('actors.title')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('actors.description')}</p>

      <Tabs defaultValue="table">
        <TabsList className="mb-4">
          <TabsTrigger value="table">{t('actors.tableView')}</TabsTrigger>
          <TabsTrigger value="tree">{t('actors.treeView')}</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <ActorsDataTable />
        </TabsContent>
        <TabsContent value="tree">
          <ActorTreeView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
