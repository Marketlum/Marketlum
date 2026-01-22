"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { ValueTree } from "@/components/value/value-tree";
import { Value, ValueType, ValueParentType } from "@/components/value/types";
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
import { Search } from "lucide-react";
import axios from "axios";
import api from "@/lib/api-sdk";

const ValueTreePage = () => {
  const searchParams = useSearchParams();
  const shouldAddRoot = searchParams.get("add") === "true";

  const [treeValues, setTreeValues] = useState<Value[] | null>(null);
  const [filteredTreeValues, setFilteredTreeValues] = useState<Value[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(shouldAddRoot);
  const [deletingValue, setDeletingValue] = useState<Value | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTreeValues = () => {
    api.getValuesTree()
      .then((data) => {
        setTreeValues(data);
        setFilteredTreeValues(data);
      })
      .catch((error) => console.error("Error fetching values:", error));
  };

  useEffect(() => {
    fetchTreeValues();
  }, []);

  useEffect(() => {
    if (shouldAddRoot) {
      setAddingRoot(true);
    }
  }, [shouldAddRoot]);

  // Filter tree values based on search query
  useEffect(() => {
    if (!treeValues) return;

    if (!searchQuery.trim()) {
      setFilteredTreeValues(treeValues);
      return;
    }

    const query = searchQuery.toLowerCase();

    const filterTree = (items: Value[]): Value[] => {
      return items.reduce<Value[]>((acc, item) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const filteredChildren = item.children ? filterTree(item.children) : [];

        if (nameMatch || descMatch || filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children,
          });
        }

        return acc;
      }, []);
    };

    setFilteredTreeValues(filterTree(treeValues));
  }, [searchQuery, treeValues]);

  const handleTreeEdit = (value: Value) => {
    setEditingId(value.id);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleCancelTreeEdit = () => {
    setEditingId(null);
  };

  const handleSaveTreeEdit = async (id: string, data: { name: string; description?: string; type: ValueType; parentType: ValueParentType; fileIds?: string[] }) => {
    try {
      await api.updateValue(id, data);
      toast.success("Value updated successfully.");
      setEditingId(null);
      fetchTreeValues();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update value.");
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

  const handleSaveNewChild = async (parentId: string, data: { name: string; description?: string; type: ValueType; parentType: ValueParentType; fileIds?: string[] }) => {
    try {
      await api.createValue({ ...data, parentId });
      toast.success("Value created successfully.");
      setAddingChildOf(null);
      fetchTreeValues();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create value.");
      }
      throw error;
    }
  };

  const handleCancelAddRoot = () => {
    setAddingRoot(false);
    // Remove ?add=true from URL
    window.history.replaceState({}, "", "/value/tree");
  };

  const handleSaveNewRoot = async (data: { name: string; description?: string; type: ValueType; parentType: ValueParentType; fileIds?: string[] }) => {
    try {
      await api.createValue(data);
      toast.success("Value created successfully.");
      setAddingRoot(false);
      // Remove ?add=true from URL
      window.history.replaceState({}, "", "/value/tree");
      fetchTreeValues();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create value.");
      }
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingValue) return;

    try {
      setIsDeleting(true);
      await api.deleteValue(deletingValue.id);
      toast.success("Value deleted successfully.");
      fetchTreeValues();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete value.");
      }
    } finally {
      setIsDeleting(false);
      setDeletingValue(null);
    }
  };

  if (!treeValues) return <MarketlumDefaultSkeleton />;

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search values..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg p-4">
        <ValueTree
          values={filteredTreeValues || []}
          editingId={editingId}
          addingChildOf={addingChildOf}
          addingRoot={addingRoot}
          onEdit={handleTreeEdit}
          onCancelEdit={handleCancelTreeEdit}
          onSaveEdit={handleSaveTreeEdit}
          onAddChild={handleAddChild}
          onCancelAddChild={handleCancelAddChild}
          onSaveNewChild={handleSaveNewChild}
          onCancelAddRoot={handleCancelAddRoot}
          onSaveNewRoot={handleSaveNewRoot}
          onDelete={setDeletingValue}
        />
      </div>

      <AlertDialog open={!!deletingValue} onOpenChange={() => setDeletingValue(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Value</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingValue?.name}&quot;?
              {deletingValue?.children?.length ? (
                <span className="block mt-2 text-destructive font-medium">
                  This value has children and cannot be deleted.
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
              disabled={isDeleting || !!deletingValue?.children?.length}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ValueTreePage;
