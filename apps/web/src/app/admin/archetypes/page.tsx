import Link from 'next/link';
import { Shapes } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ArchetypesDataTable } from '@/components/archetypes/archetypes-data-table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default async function ArchetypesPage() {
  const t = await getTranslations();

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
            <BreadcrumbPage>{t('archetypes.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <Shapes className="h-6 w-6 md:h-8 md:w-8" />
        {t('archetypes.title')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('archetypes.description')}</p>
      <ArchetypesDataTable />
    </div>
  );
}
