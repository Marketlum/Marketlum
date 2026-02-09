import Link from 'next/link';
import { Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { UsersDataTable } from '@/components/users/users-data-table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default async function UsersPage() {
  const t = await getTranslations();

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/app">{t('common.home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('users.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-4 md:mb-6 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <Users className="h-6 w-6 md:h-8 md:w-8" />
        {t('users.title')}
      </h1>
      <UsersDataTable />
    </div>
  );
}
