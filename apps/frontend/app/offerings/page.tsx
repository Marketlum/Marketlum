"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  ShoppingCart,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowUpDown,
  GitBranch,
  Eye,
  Play,
  Archive,
  RotateCcw,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import {
  Offering,
  OfferingState,
  getStateLabel,
  getStateColor,
  isOfferingActive,
  STATE_OPTIONS,
  ALLOWED_TRANSITIONS,
} from "@/components/offerings/types";
import { OfferingForm } from "@/components/offerings/offering-form";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import api from "@/lib/api-sdk";

type Agent = {
  id: string;
  name: string;
  type: string;
};

type ValueStream = {
  id: string;
  name: string;
  purpose?: string;
  children?: ValueStream[];
};

type FlatValueStream = {
  id: string;
  name: string;
  level: number;
};

// Flatten value stream tree for filter dropdown
function flattenValueStreams(streams: ValueStream[], level = 0): FlatValueStream[] {
  const result: FlatValueStream[] = [];
  for (const stream of streams) {
    result.push({ id: stream.id, name: stream.name, level });
    if (stream.children && stream.children.length > 0) {
      result.push(...flattenValueStreams(stream.children, level + 1));
    }
  }
  return result;
}

type OfferingsResponse = {
  items: Offering[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
};

const ITEMS_PER_PAGE = 10;

const OfferingsPage = () => {
  const router = useRouter();
  const [data, setData] = useState<OfferingsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<OfferingState | "">("");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [valueStreamFilter, setValueStreamFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [sort, setSort] = useState<string>("updatedAt_desc");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [valueStreams, setValueStreams] = useState<FlatValueStream[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingOffering, setEditingOffering] = useState<Offering | null>(null);
  const [deletingOffering, setDeletingOffering] = useState<Offering | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Fetch filter data
  useEffect(() => {
    Promise.all([
      api.getAgents(1, 100),
      api.getValueStreams(),
    ])
      .then(([agentsData, valueStreamsData]) => {
        setAgents(agentsData.items);
        setValueStreams(flattenValueStreams(valueStreamsData));
      })
      .catch((error) => {
        console.error("Error fetching filter data:", error);
      });
  }, []);

  const agentOptions: AutocompleteOption[] = agents.map((agent) => ({
    value: agent.id,
    label: agent.name,
    sublabel: agent.type,
  }));

  // Fetch offerings
  const fetchOfferings = (currentPage: number = page) => {
    api.getOfferings({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      q: search || undefined,
      state: stateFilter || undefined,
      agentId: agentFilter || undefined,
      valueStreamId: valueStreamFilter || undefined,
      active: activeFilter !== null ? activeFilter : undefined,
      sort,
    })
      .then((response) => setData(response))
      .catch((error) => {
        console.error("Error fetching offerings:", error);
        toast.error("Failed to fetch offerings");
      });
  };

  useEffect(() => {
    fetchOfferings(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchOfferings(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchOfferings(1);
  }, [stateFilter, agentFilter, valueStreamFilter, activeFilter, sort]);

  const handleEdit = (offering: Offering) => {
    setEditingOffering(offering);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingOffering) return;
    try {
      await api.deleteOffering(deletingOffering.id);
      toast.success("Offering deleted successfully");
      fetchOfferings();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to delete offering";
      toast.error(message);
    } finally {
      setDeletingOffering(null);
    }
  };

  const handleTransition = async (offering: Offering, to: OfferingState) => {
    try {
      await api.transitionOffering(offering.id, to);
      toast.success(`Offering ${to === "live" ? "published" : to === "archived" ? "archived" : "moved to draft"}`);
      fetchOfferings();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to transition offering";
      toast.error(message);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingOffering(null);
    fetchOfferings();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingOffering(null);
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedOfferings();
      toast.success(`Loaded ${result.inserted} offerings`);
      fetchOfferings(1);
      // Refresh filter data
      const [agentsData, valueStreamsData] = await Promise.all([
        api.getAgents(1, 100),
        api.getValueStreams(),
      ]);
      setAgents(agentsData.items);
      setValueStreams(flattenValueStreams(valueStreamsData));
    } catch {
      toast.error("Failed to load sample data");
    } finally {
      setIsSeeding(false);
    }
  };

  if (!data) {
    return <MarketlumDefaultSkeleton />;
  }

  const getTransitionIcon = (state: OfferingState) => {
    switch (state) {
      case "live":
        return <Play className="mr-2 h-4 w-4" />;
      case "archived":
        return <Archive className="mr-2 h-4 w-4" />;
      case "draft":
        return <RotateCcw className="mr-2 h-4 w-4" />;
    }
  };

  const getTransitionLabel = (state: OfferingState) => {
    switch (state) {
      case "live":
        return "Publish";
      case "archived":
        return "Archive";
      case "draft":
        return "Move to Draft";
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          OFFERINGS
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Loading..." : "Load sample data"}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Offering
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search offerings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={stateFilter || "_all"}
          onValueChange={(value) => setStateFilter(value === "_all" ? "" : value as OfferingState)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All states</SelectItem>
            {STATE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-[200px]">
          <Autocomplete
            options={agentOptions}
            value={agentFilter}
            onChange={setAgentFilter}
            placeholder="Filter by agent..."
          />
        </div>

        <Select
          value={valueStreamFilter || "_all"}
          onValueChange={(value) => setValueStreamFilter(value === "_all" ? "" : value)}
        >
          <SelectTrigger className="w-[200px]">
            <GitBranch className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Filter by stream" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All streams</SelectItem>
            {valueStreams.map((stream) => (
              <SelectItem key={stream.id} value={stream.id}>
                <span style={{ paddingLeft: `${stream.level * 12}px` }}>
                  {stream.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={activeFilter === null ? "_all" : activeFilter ? "active" : "inactive"}
          onValueChange={(value) => {
            if (value === "_all") setActiveFilter(null);
            else if (value === "active") setActiveFilter(true);
            else setActiveFilter(false);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Active status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            <SelectItem value="active">Currently active</SelectItem>
            <SelectItem value="inactive">Not active</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt_desc">Recently updated</SelectItem>
            <SelectItem value="updatedAt_asc">Oldest updated</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="name_desc">Name Z-A</SelectItem>
            <SelectItem value="state_asc">State</SelectItem>
            <SelectItem value="activeUntil_asc">Expiring soon</SelectItem>
            <SelectItem value="createdAt_desc">Newest first</SelectItem>
            <SelectItem value="createdAt_asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Value Stream</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Active Period</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No offerings found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((offering) => (
                <TableRow key={offering.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{offering.name}</div>
                      {offering.purpose && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {offering.purpose}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{offering.agent?.name || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{offering.valueStream?.name || "Unknown"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStateColor(offering.state)}>
                      {getStateLabel(offering.state)}
                    </Badge>
                    {offering.state === "live" && isOfferingActive(offering) && (
                      <Badge variant="default" className="ml-1 bg-green-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {offering.activeFrom || offering.activeUntil ? (
                      <span className="text-sm text-muted-foreground">
                        {offering.activeFrom
                          ? new Date(offering.activeFrom).toLocaleDateString()
                          : "—"}
                        {" → "}
                        {offering.activeUntil
                          ? new Date(offering.activeUntil).toLocaleDateString()
                          : "—"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{offering.items?.length || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/offerings/${offering.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(offering)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {ALLOWED_TRANSITIONS[offering.state].map((targetState) => (
                          <DropdownMenuItem
                            key={targetState}
                            onClick={() => handleTransition(offering, targetState)}
                          >
                            {getTransitionIcon(targetState)}
                            {getTransitionLabel(targetState)}
                          </DropdownMenuItem>
                        ))}
                        {offering.state === "draft" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingOffering(offering)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.currentPage} of {data.meta.totalPages} ({data.meta.totalItems} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(page - 1);
                fetchOfferings(page - 1);
              }}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(page + 1);
                fetchOfferings(page + 1);
              }}
              disabled={page === data.meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleFormCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOffering ? "Edit Offering" : "New Offering"}</DialogTitle>
          </DialogHeader>
          <OfferingForm
            offering={editingOffering}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingOffering} onOpenChange={() => setDeletingOffering(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offering</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingOffering?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OfferingsPage;
