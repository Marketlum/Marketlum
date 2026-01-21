import { TreeView, TreeDataItem } from '@/components/ui/tree-view'; 

export function MarketlumTaxonomiesTree({ data }: { data: TreeDataItem[] }) {
  return (
    <TreeView data={data} expandAll={true} />
  );
}