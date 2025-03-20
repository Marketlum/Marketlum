import { TreeView, TreeDataItem } from '@/components/ui/tree-view';
 
const data: TreeDataItem[] = [
  {
    id: '1',
    name: 'Holacracy Constitution',
    children: [
      {
        id: '2',
        name: 'Marketlum Amendment',
        children: [
          {
            id: '3',
            name: 'Marketlum Software',
          },
          {
            id: '4',
            name: 'Marketlum Coaching Services',
          },
        ],
      },
    ],
  },
];
 

export function AppValueTree() {
  return (
    <TreeView data={data} expandAll={true} />
  );
}