"use client"

import { TreeView, TreeDataItem } from "@/components/ui/tree-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Plus, Radio } from "lucide-react"
import { channelTypes } from "./form"

type Channel = {
  id: string
  name: string
  purpose?: string
  type: string
  children?: Channel[]
}

type ChannelTreeProps = {
  channels: Channel[]
  onEdit: (channel: Channel) => void
  onDelete: (channel: Channel) => void
  onAddChild: (parentId: string) => void
}

function getChannelTypeLabel(type: string): string {
  const found = channelTypes.find(t => t.value === type)
  return found?.label || type
}

function transformToTreeData(
  channels: Channel[],
  onEdit: (channel: Channel) => void,
  onDelete: (channel: Channel) => void,
  onAddChild: (parentId: string) => void
): TreeDataItem[] {
  return channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    icon: Radio,
    children: channel.children?.length
      ? transformToTreeData(channel.children, onEdit, onDelete, onAddChild)
      : undefined,
    actions: (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-xs mr-2">
          {getChannelTypeLabel(channel.type)}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation()
            onAddChild(channel.id)
          }}
          title="Add child channel"
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(channel)
          }}
          title="Edit channel"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(channel)
          }}
          title="Delete channel"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ),
  }))
}

export function ChannelTree({ channels, onEdit, onDelete, onAddChild }: ChannelTreeProps) {
  if (!channels.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No channels yet. Create your first channel to get started.
      </div>
    )
  }

  const treeData = transformToTreeData(channels, onEdit, onDelete, onAddChild)

  return (
    <TreeView
      data={treeData}
      expandAll
      defaultNodeIcon={Radio}
      defaultLeafIcon={Radio}
    />
  )
}
