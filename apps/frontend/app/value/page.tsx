"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { ValueTree } from "@/components/value/value-tree";
import { ValueList } from "@/components/value/value-list";
import { Value, ValueType, ValueParentType } from "@/components/value/types";
import { ValueInlineForm } from "@/components/value/inline-form";
import { ValueBubbleChart } from "@/components/value/bubble-chart";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Diamond, Search, TreePine, List, Database, Circle } from "lucide-react";
import axios from "axios";
import api from "@/lib/api-sdk";

type ViewMode = "tree" | "list" | "bubbles";

type PaginationMeta = {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
};

type PaginatedResponse = {
  items: Value[];
  meta: PaginationMeta;
};

const ITEMS_PER_PAGE = 10;

const ValuePage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");

  // Tree view state
  const [treeValues, setTreeValues] = useState<Value[] | null>(null);
  const [filteredTreeValues, setFilteredTreeValues] = useState<Value[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);

  // List view state
  const [listData, setListData] = useState<PaginatedResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingValue, setEditingValue] = useState<Value | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Shared state
  const [deletingValue, setDeletingValue] = useState<Value | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchTreeValues = () => {
    api.getValuesTree()
      .then((data) => {
        setTreeValues(data);
        setFilteredTreeValues(data);
      })
      .catch((error) => console.error("Error fetching values:", error));
  };

  const fetchListValues = (page: number = currentPage) => {
    api.getValuesList(page, ITEMS_PER_PAGE)
      .then((data) => setListData(data))
      .catch((error) => console.error("Error fetching values:", error));
  };

  useEffect(() => {
    if (viewMode === "tree" || viewMode === "bubbles") {
      fetchTreeValues();
    } else {
      fetchListValues(currentPage);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "list") {
      fetchListValues(currentPage);
    }
  }, [currentPage]);

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

  // Tree view handlers
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

  const handleAddRoot = () => {
    if (viewMode === "tree") {
      setAddingRoot(true);
      setEditingId(null);
      setAddingChildOf(null);
    } else {
      setShowCreateForm(true);
      setEditingValue(null);
    }
  };

  const handleCancelAddRoot = () => {
    setAddingRoot(false);
  };

  const handleSaveNewRoot = async (data: { name: string; description?: string; type: ValueType; parentType: ValueParentType; fileIds?: string[] }) => {
    try {
      await api.createValue(data);
      toast.success("Value created successfully.");
      setAddingRoot(false);
      setShowCreateForm(false);
      if (viewMode === "tree") {
        fetchTreeValues();
      } else {
        setCurrentPage(1);
        fetchListValues(1);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create value.");
      }
      throw error;
    }
  };

  // List view handlers
  const handleListEdit = (value: Value) => {
    setEditingValue(value);
    setShowCreateForm(false);
  };

  const handleSaveListEdit = async (data: { name: string; description?: string; type: ValueType; parentType: ValueParentType; fileIds?: string[] }) => {
    if (!editingValue) return;
    try {
      await api.updateValue(editingValue.id, data);
      toast.success("Value updated successfully.");
      setEditingValue(null);
      fetchListValues(currentPage);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update value.");
      }
      throw error;
    }
  };

  const handleCancelListForm = () => {
    setEditingValue(null);
    setShowCreateForm(false);
  };

  // Shared handlers
  const handleDelete = async () => {
    if (!deletingValue) return;

    try {
      setIsDeleting(true);
      await api.deleteValue(deletingValue.id);
      toast.success("Value deleted successfully.");
      if (viewMode === "tree") {
        fetchTreeValues();
      } else {
        // If we deleted the last item on this page, go to previous page
        if (listData && listData.items.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          fetchListValues(currentPage);
        }
      }
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

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode as ViewMode);
    // Reset form states when switching views
    setEditingId(null);
    setAddingChildOf(null);
    setAddingRoot(false);
    setEditingValue(null);
    setShowCreateForm(false);
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedValues();
      toast.success(`Seeded ${result.inserted} values (${result.skipped} skipped).`);
      if (viewMode === "tree") {
        fetchTreeValues();
      } else {
        setCurrentPage(1);
        fetchListValues(1);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to seed values.");
      }
    } finally {
      setIsSeeding(false);
    }
  };

  // Loading state
  if ((viewMode === "tree" || viewMode === "bubbles") && !treeValues) return <MarketlumDefaultSkeleton />;
  if (viewMode === "list" && !listData) return <MarketlumDefaultSkeleton />;

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Diamond className="h-6 w-6" />
          VALUE
        </h1>
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList>
              <TabsTrigger value="tree" className="flex items-center gap-2">
                <TreePine className="h-4 w-4" />
                Tree
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="bubbles" className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Bubbles
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Loading..." : "Load sample data"}
          </Button>
          <Button onClick={handleAddRoot}>
            <Plus className="mr-2 h-4 w-4" />
            Add Value
          </Button>
        </div>
      </header>

      {viewMode === "tree" && (
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
        </>
      )}

      {viewMode === "list" && (
        <>
          <Dialog open={showCreateForm || !!editingValue} onOpenChange={(open) => !open && handleCancelListForm()}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingValue ? "Edit Value" : "Create Value"}</DialogTitle>
              </DialogHeader>
              <ValueInlineForm
                value={editingValue || undefined}
                onSave={editingValue ? handleSaveListEdit : handleSaveNewRoot}
                onCancel={handleCancelListForm}
              />
            </DialogContent>
          </Dialog>

          <div className="border rounded-lg p-4">
            <ValueList
              values={listData?.items || []}
              currentPage={listData?.meta.currentPage || 1}
              totalPages={listData?.meta.totalPages || 1}
              totalItems={listData?.meta.totalItems || 0}
              itemsPerPage={ITEMS_PER_PAGE}
              onEdit={handleListEdit}
              onDelete={setDeletingValue}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {viewMode === "bubbles" && (
        <div className="border rounded-lg overflow-hidden" style={{ height: "70vh" }}>
          <ValueBubbleChart
            values={treeValues || []}
            onSwitchToList={() => setViewMode("list")}
          />
        </div>
      )}

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
    </div>
  );
};

export default ValuePage;
