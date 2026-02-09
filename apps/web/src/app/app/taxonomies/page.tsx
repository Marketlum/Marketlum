import Link from 'next/link';
import { FolderTree } from 'lucide-react';
import { TaxonomyTreeView } from '@/components/taxonomies/taxonomy-tree-view';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function TaxonomiesPage() {
  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/app">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Taxonomies</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-6 flex items-center gap-3 text-3xl font-bold">
        <FolderTree className="h-8 w-8" />
        Taxonomies
      </h1>
      <TaxonomyTreeView />
    </div>
  );
}
