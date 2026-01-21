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
import { Plus, BookOpen, Search, Tag } from "lucide-react";
import axios from "axios";
import api from "@/lib/api-sdk";
import { GenericTree, FieldConfig, FormData, BaseTreeItem } from "@/components/shared/tree";
import { FileUpload } from "@/components/files/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Taxonomy extends BaseTreeItem {
  id: string;
  name: string;
  description?: string | null;
  link?: string | null;
  image?: FileUpload | null;
  imageId?: string | null;
  children?: Taxonomy[];
}

const TAXONOMY_FIELDS: FieldConfig[] = [
  { name: "name", label: "Name", type: "text", required: true, minLength: 2, maxLength: 120 },
  { name: "description", label: "Description", type: "textarea" },
  { name: "link", label: "Link", type: "text" },
  { name: "image", label: "Image", type: "image" },
];

const TaxonomiesPage = () => {
  const [taxonomies, setTaxonomies] = useState<Taxonomy[] | null>(null);
  const [filteredTaxonomies, setFilteredTaxonomies] = useState<Taxonomy[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);
  const [deletingTaxonomy, setDeletingTaxonomy] = useState<Taxonomy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTaxonomies = () => {
    api.getTaxonomies()
      .then((data) => {
        setTaxonomies(data);
        setFilteredTaxonomies(data);
      })
      .catch((error) => console.error("Error fetching taxonomies:", error));
  };

  useEffect(() => {
    fetchTaxonomies();
  }, []);

  // Filter taxonomies based on search query
  useEffect(() => {
    if (!taxonomies) return;

    if (!searchQuery.trim()) {
      setFilteredTaxonomies(taxonomies);
      return;
    }

    const query = searchQuery.toLowerCase();

    const filterTree = (items: Taxonomy[]): Taxonomy[] => {
      return items.reduce<Taxonomy[]>((acc, item) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query);
        const filteredChildren = item.children ? filterTree(item.children) : [];

        if (nameMatch || descriptionMatch || filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children,
          });
        }

        return acc;
      }, []);
    };

    setFilteredTaxonomies(filterTree(taxonomies));
  }, [searchQuery, taxonomies]);

  const handleEdit = (taxonomy: Taxonomy) => {
    setEditingId(taxonomy.id);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string, data: FormData) => {
    try {
      await api.updateTaxonomy(id, {
        name: data.name as string,
        description: data.description as string | null,
        link: data.link as string | null,
        imageId: data.imageId as string | null,
      });
      toast.success("Taxonomy updated successfully.");
      setEditingId(null);
      fetchTaxonomies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update taxonomy.");
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
      await api.createTaxonomy({
        name: data.name as string,
        description: data.description as string | undefined,
        link: data.link as string | undefined,
        parentId,
        imageId: data.imageId as string | undefined,
      });
      toast.success("Taxonomy created successfully.");
      setAddingChildOf(null);
      fetchTaxonomies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create taxonomy.");
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
      await api.createTaxonomy({
        name: data.name as string,
        description: data.description as string | undefined,
        link: data.link as string | undefined,
        imageId: data.imageId as string | undefined,
      });
      toast.success("Taxonomy created successfully.");
      setAddingRoot(false);
      fetchTaxonomies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create taxonomy.");
      }
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingTaxonomy) return;

    try {
      setIsDeleting(true);
      await api.deleteTaxonomy(deletingTaxonomy.id);
      toast.success("Taxonomy deleted successfully.");
      fetchTaxonomies();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete taxonomy.");
      }
    } finally {
      setIsDeleting(false);
      setDeletingTaxonomy(null);
    }
  };

  const renderIcon = (taxonomy: Taxonomy) => {
    if (taxonomy.image) {
      return (
        <img
          src={`${apiBaseUrl}/files/${taxonomy.image.id}/thumbnail`}
          alt={taxonomy.image.altText || taxonomy.name}
          className="h-6 w-6 rounded object-cover shrink-0"
        />
      );
    }
    return <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />;
  };

  const renderSecondaryText = (taxonomy: Taxonomy) => {
    if (!taxonomy.description) return null;
    return (
      <span className="text-muted-foreground text-sm">
        — {taxonomy.description}
      </span>
    );
  };

  if (!taxonomies) return <MarketlumDefaultSkeleton />;

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          TAXONOMIES
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
          placeholder="Search taxonomies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg p-4">
        <GenericTree<Taxonomy>
          items={filteredTaxonomies || []}
          editingId={editingId}
          addingChildOf={addingChildOf}
          addingRoot={addingRoot}
          fields={TAXONOMY_FIELDS}
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
          onDelete={setDeletingTaxonomy}
          emptyMessage="No taxonomies yet. Add a root taxonomy to get started."
        />
      </div>

      <AlertDialog open={!!deletingTaxonomy} onOpenChange={() => setDeletingTaxonomy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Taxonomy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTaxonomy?.name}&quot;?
              {deletingTaxonomy?.children?.length ? (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This taxonomy has {deletingTaxonomy.children.length} child{deletingTaxonomy.children.length > 1 ? "ren" : ""}. Deleting it will also delete all children.
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

export default TaxonomiesPage;
