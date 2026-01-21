"use client"

import { Button } from "@/components/ui/button"
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton"
import { ChannelForm } from "@/components/channels/form"
import { ChannelTree } from "@/components/channels/tree"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Radio } from "lucide-react"
import axios from "axios"

import api from "@/lib/api-sdk"

type Channel = {
  id: string
  name: string
  purpose?: string
  type: string
  children?: Channel[]
}

type FormMode =
  | { type: "hidden" }
  | { type: "create"; parentId?: string }
  | { type: "edit"; channel: Channel }

const ChannelsPage = () => {
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [formMode, setFormMode] = useState<FormMode>({ type: "hidden" })
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchChannels = () => {
    api.getChannelsTree()
      .then((data) => setChannels(data))
      .catch((error) => console.error("Error fetching channels:", error))
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  const handleFormSubmit = () => {
    setFormMode({ type: "hidden" })
    fetchChannels()
  }

  const handleCancel = () => {
    setFormMode({ type: "hidden" })
  }

  const handleEdit = (channel: Channel) => {
    setFormMode({ type: "edit", channel })
  }

  const handleAddChild = (parentId: string) => {
    setFormMode({ type: "create", parentId })
  }

  const handleDelete = async () => {
    if (!deletingChannel) return

    try {
      setIsDeleting(true)
      await api.deleteChannel(deletingChannel.id)
      toast.success("Channel deleted successfully.")
      fetchChannels()
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error("Failed to delete channel.")
      }
    } finally {
      setIsDeleting(false)
      setDeletingChannel(null)
    }
  }

  if (!channels) return <MarketlumDefaultSkeleton />

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="h-6 w-6" />
          CHANNELS
        </h1>
        <Button
          onClick={() => setFormMode({ type: "create" })}
          data-testid="create-channel-button"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Channel
        </Button>
      </header>

      {formMode.type === "create" && (
        <ChannelForm
          parentId={formMode.parentId}
          onFormSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      )}

      {formMode.type === "edit" && (
        <ChannelForm
          channel={formMode.channel}
          onFormSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      )}

      <div className="border rounded-lg p-4">
        <ChannelTree
          channels={channels}
          onEdit={handleEdit}
          onDelete={setDeletingChannel}
          onAddChild={handleAddChild}
        />
      </div>

      <AlertDialog open={!!deletingChannel} onOpenChange={() => setDeletingChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingChannel?.name}&quot;?
              {deletingChannel?.children?.length ? (
                <span className="block mt-2 text-destructive font-medium">
                  This channel has children and cannot be deleted.
                </span>
              ) : (
                " This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || !!deletingChannel?.children?.length}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ChannelsPage
