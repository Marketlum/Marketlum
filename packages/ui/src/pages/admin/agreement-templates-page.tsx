'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AgreementTemplatesDataTable } from '../../components/agreement-templates/agreement-templates-data-table';
import { AgreementTemplateTreeView } from '../../components/agreement-templates/agreement-template-tree-view';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export function AgreementTemplatesPage() {
  const t = useTranslations('agreementTemplates');
  const tc = useTranslations('common');

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">{tc('home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <ClipboardList className="h-6 w-6 md:h-8 md:w-8" />
        {t('title')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('subtitle')}</p>

      <Tabs defaultValue="table">
        <TabsList className="mb-4">
          <TabsTrigger value="table">{t('tableView')}</TabsTrigger>
          <TabsTrigger value="tree">{t('treeView')}</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <AgreementTemplatesDataTable />
        </TabsContent>
        <TabsContent value="tree">
          <AgreementTemplateTreeView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
