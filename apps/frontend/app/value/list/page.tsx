"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { ValueList } from "@/components/value/value-list";
import { Value, ValueType, ValueParentType, VALUE_TYPES } from "@/components/value/types";
import { ValueInlineForm } from "@/components/value/inline-form";
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
import { toast } from "sonner";
import { Search, X, ArrowUpDown } from "lucide-react";
import axios from "axios";
import api from "@/lib/api-sdk";

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

type SortOption = {
  value: string;
  label: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
};

const SORT_OPTIONS: SortOption[] = [
  { value: 'name-asc', label: 'Name (A-Z)', sortBy: 'name', sortOrder: 'ASC' },
  { value: 'name-desc', label: 'Name (Z-A)', sortBy: 'name', sortOrder: 'DESC' },
  { value: 'type-asc', label: 'Type (A-Z)', sortBy: 'type', sortOrder: 'ASC' },
  { value: 'type-desc', label: 'Type (Z-A)', sortBy: 'type', sortOrder: 'DESC' },
  { value: 'createdAt-desc', label: 'Newest first', sortBy: 'createdAt', sortOrder: 'DESC' },
  { value: 'createdAt-asc', label: 'Oldest first', sortBy: 'createdAt', sortOrder: 'ASC' },
];

const ITEMS_PER_PAGE = 10;

const ValueListPage = () => {
  const searchParams = useSearchParams();
  const shouldAdd = searchParams.get("add") === "true";

  const [listData, setListData] = useState<PaginatedResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingValue, setEditingValue] = useState<Value | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(shouldAdd);
  const [deletingValue, setDeletingValue] = useState<Value | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("name-asc");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchListValues = useCallback((page: number = currentPage) => {
    const selectedSort = SORT_OPTIONS.find(opt => opt.value === sortOption) || SORT_OPTIONS[0];
    api.getValuesList(page, ITEMS_PER_PAGE, {
      search: debouncedSearch || undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      sortBy: selectedSort.sortBy,
      sortOrder: selectedSort.sortOrder,
    })
      .then((data) => setListData(data))
      .catch((error) => console.error("Error fetching values:", error));
  }, [debouncedSearch, typeFilter, sortOption, currentPage]);

  useEffect(() => {
    fetchListValues(currentPage);
  }, [currentPage, debouncedSearch, typeFilter, sortOption, fetchListValues]);

  useEffect(() => {
    if (shouldAdd) {
      setShowCreateForm(true);
    }
  }, [shouldAdd]);

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

  const handleSaveNewValue = async (data: { name: string; description?: string; type: ValueType; parentType: ValueParentType; fileIds?: string[] }) => {
    try {
      await api.createValue(data);
      toast.success("Value created successfully.");
      setShowCreateForm(false);
      // Remove ?add=true from URL
      window.history.replaceState({}, "", "/value/list");
      setCurrentPage(1);
      fetchListValues(1);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create value.");
      }
      throw error;
    }
  };

  const handleCancelForm = () => {
    setEditingValue(null);
    setShowCreateForm(false);
    // Remove ?add=true from URL if present
    window.history.replaceState({}, "", "/value/list");
  };

  const handleDelete = async () => {
    if (!deletingValue) return;

    try {
      setIsDeleting(true);
      await api.deleteValue(deletingValue.id);
      toast.success("Value deleted successfully.");
      // If we deleted the last item on this page, go to previous page
      if (listData && listData.items.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchListValues(currentPage);
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

  const handleClearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSortOption("name-asc");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || typeFilter !== "all" || sortOption !== "name-asc";

  if (!listData) return <MarketlumDefaultSkeleton />;

  return (
    <>
      <Dialog open={showCreateForm || !!editingValue} onOpenChange={(open) => !open && handleCancelForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingValue ? "Edit Value" : "Create Value"}</DialogTitle>
          </DialogHeader>
          <ValueInlineForm
            value={editingValue || undefined}
            onSave={editingValue ? handleSaveListEdit : handleSaveNewValue}
            onCancel={handleCancelForm}
          />
        </DialogContent>
      </Dialog>

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {VALUE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortOption} onValueChange={(value) => { setSortOption(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

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

export default ValueListPage;
