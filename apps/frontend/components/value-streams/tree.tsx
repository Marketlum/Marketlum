import { TreeView, TreeDataItem } from '@/components/ui/tree-view';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { Eye, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation';
import api from "@/lib/api-sdk";
import { toast } from 'sonner';
import { mutate } from "swr";
 
export default function MarketlumValueStreamsTree({ data }: { data: TreeDataItem[] }) {
  const router = useRouter();

  async function handleItemDelete(id: string) {
      try {
        await api.deleteValueStream(id);
        toast.success("Value stream has been successfully deleted.")
        mutate('/value-streams');
      } catch(error) {
        toast.error("Cannot delete a value stream right now.");
      }
  }

  const attachActions = (items => {
    items.forEach(item => {
      item.actions = (
        <div>
          <Button variant="outline" size="icon" onClick={() => router.push(`/value-streams/${item.id}`)}><Eye /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon"><Trash /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this value stream and associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleItemDelete(item.id)}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </div>
      );

      if (item.children?.length > 0 ) {
        attachActions(item.children);
      }
    })

  })

  attachActions(data);

  return (
    <TreeView data={data} expandAll={true} initialSelectedItemId={data[0].id} />
  );
}