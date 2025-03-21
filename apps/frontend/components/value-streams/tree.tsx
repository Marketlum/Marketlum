import { TreeView, TreeDataItem } from '@/components/ui/tree-view';
import { Folder } from 'lucide-react';
 
export function MarketlumValueStreamsTree({ data }: { data: TreeDataItem[] }) {
  return (
    <TreeView data={data} expandAll={true} />
  );
}