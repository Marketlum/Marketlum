import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ExchangeFlowGraph } from '@/components/exchanges/exchange-flow-graph';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default async function ExchangeFlowGraphPage() {
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
            <BreadcrumbLink asChild>
              <Link href="/admin/exchanges">{t('exchanges.title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('exchanges.flowGraph')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-1 flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold">
        <ArrowLeftRight className="h-6 w-6 md:h-8 md:w-8" />
        {t('exchanges.flowGraph')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('exchanges.flowGraphDescription')}</p>
      <ExchangeFlowGraph />
    </div>
  );
}
