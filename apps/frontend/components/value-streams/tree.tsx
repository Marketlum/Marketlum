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
 
export default function MarketlumValueStreamsTree({ data }: { data: TreeDataItem[] }) {
  const router = useRouter();

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
                  This action cannot be undone. This will permanently delete your
                  account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
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