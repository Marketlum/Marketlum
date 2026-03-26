import Link from 'next/link';
import { FileIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FilesManager } from '../../components/files/files-manager';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';

export async function FilesPage() {
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
            <BreadcrumbPage>{t('files.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <FileIcon className="h-6 w-6 md:h-8 md:w-8" />
        {t('files.title')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('files.description')}</p>
      <FilesManager />
    </div>
  );
}
