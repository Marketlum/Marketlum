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
 

export function AppTaxonomiesTree({ data }: { data: TreeDataItem[] }) {
  return (
    <TreeView data={data} expandAll={true} />
  );
}