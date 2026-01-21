"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, HandHeart, Search } from "lucide-react";
import axios from "axios";
import api from "@/lib/api-sdk";
import { GenericTree, FieldConfig, FormData, BaseTreeItem } from "@/components/shared/tree";
import { ValueStreamIcon } from "@/components/value-streams/icons";
import { FileUpload } from "@/components/files/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface ValueStream extends BaseTreeItem {
  id: string;
  name: string;
  purpose?: string;
  image?: FileUpload | null;
  imageId?: string | null;
  children?: ValueStream[];
}

const VALUE_STREAM_FIELDS: FieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, minLength: 2, maxLength: 120 },
  { name: "purpose", label: "Purpose", type: "textarea" },
  { name: "image", label: "Image", type: "image" },
];

const ValueStreamsPage = () => {
  const [valueStreams, setValueStreams] = useState<ValueStream[] | null>(null);
  const [filteredValueStreams, setFilteredValueStreams] = useState<ValueStream[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);
  const [deletingValueStream, setDeletingValueStream] = useState<ValueStream | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchValueStreams = () => {
    api.getValueStreams()
      .then((data) => {
        setValueStreams(data);
        setFilteredValueStreams(data);
      })
      .catch((error) => console.error("Error fetching value streams:", error));
  };

  useEffect(() => {
    fetchValueStreams();
  }, []);

  // Filter value streams based on search query
  useEffect(() => {
    if (!valueStreams) return;

    if (!searchQuery.trim()) {
      setFilteredValueStreams(valueStreams);
      return;
    }

    const query = searchQuery.toLowerCase();

    const filterTree = (items: ValueStream[]): ValueStream[] => {
      return items.reduce<ValueStream[]>((acc, item) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const purposeMatch = item.purpose?.toLowerCase().includes(query);
        const filteredChildren = item.children ? filterTree(item.children) : [];

        if (nameMatch || purposeMatch || filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children,
          });
        }

        return acc;
      }, []);
    };

    setFilteredValueStreams(filterTree(valueStreams));
  }, [searchQuery, valueStreams]);

  const handleEdit = (valueStream: ValueStream) => {
    setEditingId(valueStream.id);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string, data: FormData) => {
    try {
      await api.updateValueStream(id, {
        name: data.name as string,
        purpose: data.purpose as string | undefined,
        imageId: data.imageId as string | null,
      });
      toast.success("Value stream updated successfully.");
      setEditingId(null);
      fetchValueStreams();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update value stream.");
      }
      throw error;
    }
  };

  const handleAddChild = (parentId: string) => {
    setAddingChildOf(parentId);
    setEditingId(null);
    setAddingRoot(false);
  };

  const handleCancelAddChild = () => {
    setAddingChildOf(null);
  };

  const handleSaveNewChild = async (parentId: string, data: FormData) => {
    try {
      await api.createValueStream({
        name: data.name as string,
        purpose: (data.purpose as string) || "",
        parentId,
        imageId: data.imageId as string | undefined,
      });
      toast.success("Value stream created successfully.");
      setAddingChildOf(null);
      fetchValueStreams();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create value stream.");
      }
      throw error;
    }
  };

  const handleAddRoot = () => {
    setAddingRoot(true);
    setEditingId(null);
    setAddingChildOf(null);
  };

  const handleCancelAddRoot = () => {
    setAddingRoot(false);
  };

  const handleSaveNewRoot = async (data: FormData) => {
    try {
      await api.createValueStream({
        name: data.name as string,
        purpose: (data.purpose as string) || "",
        imageId: data.imageId as string | undefined,
      });
      toast.success("Value stream created successfully.");
      setAddingRoot(false);
      fetchValueStreams();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create value stream.");
      }
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingValueStream) return;

    try {
      setIsDeleting(true);
      await api.deleteValueStream(deletingValueStream.id);
      toast.success("Value stream deleted successfully.");
      fetchValueStreams();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete value stream.");
      }
    } finally {
      setIsDeleting(false);
      setDeletingValueStream(null);
    }
  };

  const renderIcon = (valueStream: ValueStream) => {
    if (valueStream.image) {
      return (
        <img
          src={`${apiBaseUrl}/files/${valueStream.image.id}/thumbnail`}
          alt={valueStream.image.altText || valueStream.name}
          className="h-6 w-6 rounded object-cover shrink-0"
        />
      );
    }
    return <ValueStreamIcon className="h-4 w-4 shrink-0" />;
  };

  const renderSecondaryText = (valueStream: ValueStream) => {
    if (!valueStream.purpose) return null;
    return (
      <span className="text-muted-foreground text-sm">
        — {valueStream.purpose}
      </span>
    );
  };

  if (!valueStreams) return <MarketlumDefaultSkeleton />;

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HandHeart className="h-6 w-6" />
          VALUE STREAMS
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleAddRoot}>
            <Plus className="mr-2 h-4 w-4" />
            Add Root
          </Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search value streams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg p-4">
        <GenericTree<ValueStream>
          items={filteredValueStreams || []}
          editingId={editingId}
          addingChildOf={addingChildOf}
          addingRoot={addingRoot}
          fields={VALUE_STREAM_FIELDS}
          renderIcon={renderIcon}
          renderSecondaryText={renderSecondaryText}
          onEdit={handleEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onAddChild={handleAddChild}
          onCancelAddChild={handleCancelAddChild}
          onSaveNewChild={handleSaveNewChild}
          onCancelAddRoot={handleCancelAddRoot}
          onSaveNewRoot={handleSaveNewRoot}
          onDelete={setDeletingValueStream}
          emptyMessage="No value streams yet. Add a root value stream to get started."
        />
      </div>

      <AlertDialog open={!!deletingValueStream} onOpenChange={() => setDeletingValueStream(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Value Stream</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingValueStream?.name}&quot;?
              {deletingValueStream?.children?.length ? (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This value stream has {deletingValueStream.children.length} child{deletingValueStream.children.length > 1 ? "ren" : ""}. Deleting it may also affect its children.
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
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ValueStreamsPage;
