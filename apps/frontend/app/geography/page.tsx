"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { GeographyTree } from "@/components/geographies/tree";
import { Geography, GeographyLevel } from "@/components/geographies/types";
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
import { Plus, Globe, Database, Search } from "lucide-react";
import axios from "axios";
import api from "@/lib/api-sdk";

const GeographyPage = () => {
  const [geographies, setGeographies] = useState<Geography[] | null>(null);
  const [filteredGeographies, setFilteredGeographies] = useState<Geography[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);
  const [deletingGeography, setDeletingGeography] = useState<Geography | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchGeographies = () => {
    api.getGeographiesTree()
      .then((data) => {
        setGeographies(data);
        setFilteredGeographies(data);
      })
      .catch((error) => console.error("Error fetching geographies:", error));
  };

  useEffect(() => {
    fetchGeographies();
  }, []);

  // Filter geographies based on search query
  useEffect(() => {
    if (!geographies) return;

    if (!searchQuery.trim()) {
      setFilteredGeographies(geographies);
      return;
    }

    const query = searchQuery.toLowerCase();

    const filterTree = (items: Geography[]): Geography[] => {
      return items.reduce<Geography[]>((acc, item) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const codeMatch = item.code.toLowerCase().includes(query);
        const filteredChildren = item.children ? filterTree(item.children) : [];

        if (nameMatch || codeMatch || filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children,
          });
        }

        return acc;
      }, []);
    };

    setFilteredGeographies(filterTree(geographies));
  }, [searchQuery, geographies]);

  const handleEdit = (geography: Geography) => {
    setEditingId(geography.id);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string, data: { name: string; code: string; level: GeographyLevel }) => {
    try {
      await api.updateGeography(id, data);
      toast.success("Geography updated successfully.");
      setEditingId(null);
      fetchGeographies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update geography.");
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

  const handleSaveNewChild = async (parentId: string, data: { name: string; code: string; level: GeographyLevel }) => {
    try {
      await api.createGeography({ ...data, parentId });
      toast.success("Geography created successfully.");
      setAddingChildOf(null);
      fetchGeographies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create geography.");
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

  const handleSaveNewRoot = async (data: { name: string; code: string; level: GeographyLevel }) => {
    try {
      await api.createGeography(data);
      toast.success("Geography created successfully.");
      setAddingRoot(false);
      fetchGeographies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create geography.");
      }
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingGeography) return;

    try {
      setIsDeleting(true);
      await api.deleteGeography(deletingGeography.id);
      toast.success("Geography deleted successfully.");
      fetchGeographies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete geography.");
      }
    } finally {
      setIsDeleting(false);
      setDeletingGeography(null);
    }
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await api.seedGeographies();
      toast.success("Sample geographies seeded successfully.");
      fetchGeographies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to seed geographies.");
      }
    } finally {
      setIsSeeding(false);
    }
  };

  if (!geographies) return <MarketlumDefaultSkeleton />;

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6" />
          GEOGRAPHY
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSeed}
            disabled={isSeeding}
          >
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Loading..." : "Load sample data"}
          </Button>
          <Button onClick={handleAddRoot}>
            <Plus className="mr-2 h-4 w-4" />
            Add Root
          </Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search geographies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg p-4">
        <GeographyTree
          geographies={filteredGeographies || []}
          editingId={editingId}
          addingChildOf={addingChildOf}
          addingRoot={addingRoot}
          onEdit={handleEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onAddChild={handleAddChild}
          onCancelAddChild={handleCancelAddChild}
          onSaveNewChild={handleSaveNewChild}
          onCancelAddRoot={handleCancelAddRoot}
          onSaveNewRoot={handleSaveNewRoot}
          onDelete={setDeletingGeography}
        />
      </div>

      <AlertDialog open={!!deletingGeography} onOpenChange={() => setDeletingGeography(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Geography</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingGeography?.name}&quot;?
              {deletingGeography?.children?.length ? (
                <span className="block mt-2 text-destructive font-medium">
                  This geography has children and cannot be deleted.
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
              disabled={isDeleting || !!deletingGeography?.children?.length}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GeographyPage;
