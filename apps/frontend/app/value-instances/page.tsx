"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowRight,
  Eye,
  EyeOff,
  TreeDeciduous,
  List,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import {
  ValueInstance,
  ValueInstanceTreeNode,
  ValueInstanceDirection,
  ValueInstanceVisibility,
  DIRECTION_OPTIONS,
  VISIBILITY_OPTIONS,
  SORT_OPTIONS,
  getDirectionLabel,
  getVisibilityLabel,
} from "@/components/value-instances/types";
import { ValueInstanceForm } from "@/components/value-instances/value-instance-form";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import api from "@/lib/api-sdk";

type Agent = { id: string; name: string };
type Value = { id: string; name: string; type: string };

const ITEMS_PER_PAGE = 20;

const ValueInstancesPage = () => {
  const router = useRouter();
  const [data, setData] = useState<{ data: ValueInstance[]; total: number } | null>(null);
  const [treeData, setTreeData] = useState<ValueInstanceTreeNode[] | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [valueFilter, setValueFilter] = useState<string>("");
  const [directionFilter, setDirectionFilter] = useState<ValueInstanceDirection | "">("");
  const [visibilityFilter, setVisibilityFilter] = useState<ValueInstanceVisibility | "">("");
  const [fromAgentFilter, setFromAgentFilter] = useState<string>("");
  const [toAgentFilter, setToAgentFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("updatedAt_desc");
  const [showTree, setShowTree] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [values, setValues] = useState<Value[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingInstance, setEditingInstance] = useState<ValueInstance | null>(null);
  const [deletingInstance, setDeletingInstance] = useState<ValueInstance | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Fetch filter data
  useEffect(() => {
    Promise.all([
      api.getAgents(1, 100),
      api.getValuesTree(),
    ])
      .then(([agentsData, valuesData]) => {
        setAgents(agentsData.items || []);
        // Flatten values tree if needed
        const flatValues: Value[] = [];
        const flatten = (items: any[]) => {
          for (const item of items) {
            flatValues.push({ id: item.id, name: item.name, type: item.type });
            if (item.children) flatten(item.children);
          }
        };
        if (Array.isArray(valuesData)) {
          flatten(valuesData);
        }
        setValues(flatValues);
      })
      .catch((error) => console.error("Error fetching filter data:", error));
  }, []);

  // Fetch data
  const fetchData = async () => {
    try {
      if (showTree) {
        const tree = await api.getValueInstancesTree({
          valueId: valueFilter || undefined,
          visibility: visibilityFilter || undefined,
        });
        setTreeData(tree);
      } else {
        const result = await api.getValueInstances({
          q: search || undefined,
          valueId: valueFilter || undefined,
          direction: directionFilter || undefined,
          visibility: visibilityFilter || undefined,
          fromAgentId: fromAgentFilter || undefined,
          toAgentId: toAgentFilter || undefined,
          sort,
          page,
          pageSize: ITEMS_PER_PAGE,
        });
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load value instances");
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, valueFilter, directionFilter, visibilityFilter, fromAgentFilter, toAgentFilter, sort, showTree]);

  const handleDelete = async () => {
    if (!deletingInstance) return;
    try {
      await api.deleteValueInstance(deletingInstance.id);
      toast.success("Value instance deleted");
      setDeletingInstance(null);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete");
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await api.seedValueInstances();
      toast.success(`Seeded ${result.created} value instances`);
      fetchData();
    } catch (error) {
      toast.error("Failed to seed data");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingInstance(null);
    fetchData();
  };

  const agentOptions: AutocompleteOption[] = agents.map((a) => ({ value: a.id, label: a.name }));

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;

  if (!showTree && !data) return <MarketlumDefaultSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Value Instances</h1>
          <p className="text-muted-foreground">Track concrete occurrences of value in the market</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Seeding..." : "Load sample data"}
          </Button>
          <Button onClick={() => { setEditingInstance(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Instance
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, purpose..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        <Select value={valueFilter} onValueChange={(v) => { setValueFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Values</SelectItem>
            {values.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={directionFilter} onValueChange={(v) => { setDirectionFilter(v === "all" ? "" : v as ValueInstanceDirection); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            {DIRECTION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={visibilityFilter} onValueChange={(v) => { setVisibilityFilter(v === "all" ? "" : v as ValueInstanceVisibility); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {VISIBILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Autocomplete
          options={agentOptions}
          value={fromAgentFilter}
          onChange={(v) => { setFromAgentFilter(v); setPage(1); }}
          placeholder="From Agent"
          className="w-[150px]"
        />

        <Autocomplete
          options={agentOptions}
          value={toAgentFilter}
          onChange={(v) => { setToAgentFilter(v); setPage(1); }}
          placeholder="To Agent"
          className="w-[150px]"
        />

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="tree-toggle" className="text-sm text-muted-foreground">Tree</Label>
          <Switch
            id="tree-toggle"
            checked={showTree}
            onCheckedChange={setShowTree}
          />
        </div>
      </div>

      {/* Content */}
      {showTree ? (
        <TreeView
          nodes={treeData || []}
          onEdit={(id) => {
            api.getValueInstance(id).then(setEditingInstance).then(() => setShowForm(true));
          }}
          onDelete={(id) => {
            api.getValueInstance(id).then(setDeletingInstance);
          }}
          onAddChild={(parentId) => {
            api.getValueInstance(parentId).then((parent) => {
              setEditingInstance({ parentId: parent.id, valueId: parent.valueId, visibility: parent.visibility } as any);
              setShowForm(true);
            });
          }}
        />
      ) : (
        <>
          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No value instances found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((instance) => (
                    <TableRow
                      key={instance.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/value-instances/${instance.id}`)}
                    >
                      <TableCell className="font-medium">{instance.name}</TableCell>
                      <TableCell>{instance.value?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDirectionLabel(instance.direction)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <span>{instance.fromAgent?.name || "-"}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span>{instance.toAgent?.name || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{instance.version}</TableCell>
                      <TableCell>
                        <Badge variant={instance.visibility === "public" ? "default" : "secondary"}>
                          {instance.visibility === "public" ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                          {getVisibilityLabel(instance.visibility)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(instance.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingInstance(instance); setShowForm(true); }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setDeletingInstance(instance); }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, data?.total || 0)} of {data?.total} instances
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInstance?.id ? "Edit" : "New"} Value Instance</DialogTitle>
          </DialogHeader>
          <ValueInstanceForm
            instance={editingInstance}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingInstance} onOpenChange={() => setDeletingInstance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Value Instance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingInstance?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Tree View Component
const TreeView = ({
  nodes,
  onEdit,
  onDelete,
  onAddChild,
}: {
  nodes: ValueInstanceTreeNode[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) => {
  if (nodes.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <TreeDeciduous className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No value instances found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
};

const TreeNode = ({
  node,
  level,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: ValueInstanceTreeNode;
  level: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-2 hover:bg-muted/50 rounded group"
        style={{ marginLeft: level * 24 }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <span className="w-4" />
          )}
        </button>
        <span className="font-medium flex-1">{node.name}</span>
        <Badge variant="outline" className="text-xs">{node.version}</Badge>
        <Badge variant={node.visibility === "public" ? "default" : "secondary"} className="text-xs">
          {node.visibility}
        </Badge>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onAddChild(node.id)}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(node.id)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onDelete(node.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueInstancesPage;
