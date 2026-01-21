"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { StatsCards } from "@/components/agreements/stats-cards";
import { AgreementsList } from "@/components/agreements/agreements-list";
import { AgreementForm } from "@/components/agreements/agreement-form";
import {
  Agreement,
  AgreementCategory,
  AgreementGateway,
  AgreementStats,
  CATEGORY_OPTIONS,
  GATEWAY_OPTIONS,
} from "@/components/agreements/types";
import { toast } from "sonner";
import {
  Plus,
  FileSignature,
  Search,
  TreePine,
  List,
  Database,
} from "lucide-react";
import axios from "axios";
import api from "@/lib/api-sdk";

type ViewMode = "list" | "tree";

type PaginationMeta = {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
};

type PaginatedResponse = {
  items: Agreement[];
  meta: PaginationMeta;
};

const ITEMS_PER_PAGE = 10;

const AgreementsPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Stats
  const [stats, setStats] = useState<AgreementStats | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AgreementCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<"open" | "completed" | "">("");
  const [gatewayFilter, setGatewayFilter] = useState<AgreementGateway | "">("");

  // List view state
  const [listData, setListData] = useState<PaginatedResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Tree view state
  const [treeData, setTreeData] = useState<Agreement[] | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);

  // Delete state
  const [deletingAgreement, setDeletingAgreement] = useState<Agreement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchStats = () => {
    api
      .getAgreementsStats({
        category: categoryFilter || undefined,
      })
      .then((data) => setStats(data))
      .catch((error) => console.error("Error fetching stats:", error));
  };

  const fetchListData = (page: number = currentPage) => {
    api
      .getAgreements({
        page,
        limit: ITEMS_PER_PAGE,
        q: searchQuery || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        gateway: gatewayFilter || undefined,
      })
      .then((data) => setListData(data))
      .catch((error) => console.error("Error fetching agreements:", error));
  };

  const fetchTreeData = () => {
    api
      .getAgreementsTree()
      .then((data) => setTreeData(data))
      .catch((error) => console.error("Error fetching agreements tree:", error));
  };

  useEffect(() => {
    fetchStats();
  }, [categoryFilter]);

  useEffect(() => {
    if (viewMode === "list") {
      fetchListData(1);
      setCurrentPage(1);
    } else {
      fetchTreeData();
    }
  }, [viewMode, searchQuery, categoryFilter, statusFilter, gatewayFilter]);

  useEffect(() => {
    if (viewMode === "list") {
      fetchListData(currentPage);
    }
  }, [currentPage]);

  const handleStatsFilterClick = (filter: "open" | "completed" | null) => {
    if (filter === null) {
      setStatusFilter("");
    } else {
      setStatusFilter(filter);
    }
  };

  const handleCreate = () => {
    setEditingAgreement(null);
    setAddingChildOf(null);
    setShowForm(true);
  };

  const handleEdit = (agreement: Agreement) => {
    setEditingAgreement(agreement);
    setAddingChildOf(null);
    setShowForm(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingAgreement(null);
    setAddingChildOf(parentId);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAgreement(null);
    setAddingChildOf(null);
  };

  const handleSave = async (data: {
    title: string;
    category: AgreementCategory;
    gateway: AgreementGateway;
    link?: string;
    content?: string;
    completedAt?: string | null;
    parentId?: string | null;
    fileId?: string | null;
    parties?: Array<{ agentId: string; role?: string }>;
  }) => {
    try {
      if (editingAgreement) {
        await api.updateAgreement(editingAgreement.id, data);
        toast.success("Agreement updated successfully.");
      } else {
        await api.createAgreement(data);
        toast.success("Agreement created successfully.");
      }
      setShowForm(false);
      setEditingAgreement(null);
      setAddingChildOf(null);
      fetchStats();
      if (viewMode === "list") {
        fetchListData(currentPage);
      } else {
        fetchTreeData();
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to save agreement.");
      }
      throw error;
    }
  };

  const handleToggleComplete = async (agreement: Agreement) => {
    try {
      const isOpen = !agreement.completedAt;
      await api.updateAgreement(agreement.id, {
        completedAt: isOpen ? new Date().toISOString() : null,
      });
      toast.success(
        isOpen ? "Agreement marked as completed." : "Agreement reopened."
      );
      fetchStats();
      if (viewMode === "list") {
        fetchListData(currentPage);
      } else {
        fetchTreeData();
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update agreement.");
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingAgreement) return;

    try {
      setIsDeleting(true);
      await api.deleteAgreement(deletingAgreement.id);
      toast.success("Agreement deleted successfully.");
      fetchStats();
      if (viewMode === "list") {
        if (listData && listData.items.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          fetchListData(currentPage);
        }
      } else {
        fetchTreeData();
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete agreement.");
      }
    } finally {
      setIsDeleting(false);
      setDeletingAgreement(null);
    }
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedAgreements();
      toast.success(`Seeded ${result.inserted} agreements (${result.skipped} skipped).`);
      fetchStats();
      if (viewMode === "list") {
        setCurrentPage(1);
        fetchListData(1);
      } else {
        fetchTreeData();
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to seed agreements.");
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode as ViewMode);
  };

  // Loading state
  if (!stats) return <MarketlumDefaultSkeleton />;
  if (viewMode === "list" && !listData) return <MarketlumDefaultSkeleton />;
  if (viewMode === "tree" && !treeData) return <MarketlumDefaultSkeleton />;

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSignature className="h-6 w-6" />
          AGREEMENTS
        </h1>
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="tree" className="flex items-center gap-2">
                <TreePine className="h-4 w-4" />
                Tree
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Seeding..." : "Seed Sample Data"}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Agreement
          </Button>
        </div>
      </header>

      <StatsCards
        stats={stats}
        activeFilter={statusFilter || null}
        onFilterClick={handleStatsFilterClick}
      />

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agreements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={categoryFilter || "_all"}
          onValueChange={(v) =>
            setCategoryFilter(v === "_all" ? "" : (v as AgreementCategory))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={gatewayFilter || "_all"}
          onValueChange={(v) =>
            setGatewayFilter(v === "_all" ? "" : (v as AgreementGateway))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Gateway" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Gateways</SelectItem>
            {GATEWAY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => !open && handleCancelForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgreement
                ? "Edit Agreement"
                : addingChildOf
                ? "Add Annex"
                : "Create Agreement"}
            </DialogTitle>
          </DialogHeader>
          <AgreementForm
            agreement={editingAgreement || undefined}
            parentId={addingChildOf || undefined}
            onSave={handleSave}
            onCancel={handleCancelForm}
          />
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg p-4">
        <AgreementsList
          agreements={
            viewMode === "list" ? listData?.items || [] : treeData || []
          }
          currentPage={listData?.meta.currentPage || 1}
          totalPages={listData?.meta.totalPages || 1}
          totalItems={listData?.meta.totalItems || 0}
          itemsPerPage={ITEMS_PER_PAGE}
          onEdit={handleEdit}
          onDelete={setDeletingAgreement}
          onAddChild={handleAddChild}
          onToggleComplete={handleToggleComplete}
          onPageChange={setCurrentPage}
          isTree={viewMode === "tree"}
        />
      </div>

      <AlertDialog
        open={!!deletingAgreement}
        onOpenChange={() => setDeletingAgreement(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAgreement?.title}
              &quot;?
              {deletingAgreement?.children &&
              deletingAgreement.children.length > 0 ? (
                <span className="block mt-2 text-destructive font-medium">
                  This agreement has annexes and cannot be deleted. Delete
                  annexes first.
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
              disabled={
                isDeleting ||
                (deletingAgreement?.children &&
                  deletingAgreement.children.length > 0)
              }
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgreementsPage;
