import { TreeView, TreeDataItem } from '@/components/ui/tree-view';

import { Eye, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation';
 
export default function MarketlumValueStreamsTree({ data }: { data: TreeDataItem[] }) {
  const router = useRouter();

  const attachActions = (items => {
    items.forEach(item => {
      item.actions = (
        <div>
          <Button variant="outline" size="icon" onClick={() => router.push(`/value-streams/${item.id}`)}><Eye /></Button>
          <Button variant="outline" size="icon"><Pencil /></Button>
          <Button variant="outline" size="icon"><Trash /></Button>
        </div>
      );

      if (item.children?.length > 0 ) {
        attachActions(item.children);
      }
    })

  })

  attachActions(data);

  return (
    <TreeView data={data} expandAll={true} />
  );
}