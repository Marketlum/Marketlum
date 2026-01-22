export type ValueInstanceDirection = 'incoming' | 'outgoing' | 'internal' | 'neutral';
export type ValueInstanceVisibility = 'public' | 'private';

export interface ValueInstance {
  id: string;
  valueId: string;
  value?: {
    id: string;
    name: string;
    type: string;
  };
  name: string;
  purpose: string | null;
  version: string;
  direction: ValueInstanceDirection;
  fromAgentId: string | null;
  fromAgent?: {
    id: string;
    name: string;
  } | null;
  toAgentId: string | null;
  toAgent?: {
    id: string;
    name: string;
  } | null;
  parentId: string | null;
  parent?: ValueInstance | null;
  children?: ValueInstance[];
  link: string | null;
  imageFileId: string | null;
  imageFile?: {
    id: string;
    filename: string;
    url: string;
  } | null;
  visibility: ValueInstanceVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface ValueInstanceTreeNode {
  id: string;
  name: string;
  version: string;
  visibility: ValueInstanceVisibility;
  valueId: string;
  children: ValueInstanceTreeNode[];
}

export const DIRECTION_OPTIONS = [
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
  { value: 'internal', label: 'Internal' },
  { value: 'neutral', label: 'Neutral' },
];

export const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

export const SORT_OPTIONS = [
  { value: 'updatedAt_desc', label: 'Recently Updated' },
  { value: 'createdAt_desc', label: 'Recently Created' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'version_desc', label: 'Version (Newest)' },
];

export function getDirectionLabel(direction: ValueInstanceDirection): string {
  return DIRECTION_OPTIONS.find(o => o.value === direction)?.label || direction;
}

export function getVisibilityLabel(visibility: ValueInstanceVisibility): string {
  return VISIBILITY_OPTIONS.find(o => o.value === visibility)?.label || visibility;
}
