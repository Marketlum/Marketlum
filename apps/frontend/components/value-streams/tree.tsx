import { TreeView, TreeDataItem } from '@/components/ui/tree-view';
 
export default function MarketlumValueStreamsTree({ data }: { data: TreeDataItem[] }) {
  return (
    <TreeView data={data} expandAll={true} />
  );
}