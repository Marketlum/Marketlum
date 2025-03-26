import { TreeView, TreeDataItem } from '@/components/ui/tree-view';

import { Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation';
 
export default function MarketlumValueStreamsTree({ data }: { data: TreeDataItem[] }) {
  const router = useRouter();

  data.forEach(item => {
    item.actions = (
      <div>
        <Button variant="outline" size="icon"><Pencil />
        </Button>
        <Button variant="outline" size="icon"><Trash /></Button>
      </div>
    );
    item.onClick = () => {
      router.push(`/value-streams/${item.id}`);
    }
  })

  return (
    <TreeView data={data} expandAll={true} />
  );
}