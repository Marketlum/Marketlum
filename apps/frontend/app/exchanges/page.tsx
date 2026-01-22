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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Plus,
  Search,
  ArrowLeftRight,
  Pencil,
  Trash2,
  MoreHorizontal,
  Database,
  ArrowUpDown,
  GitBranch,
  Eye,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Users,
  ArrowRight,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import {
  Exchange,
  ExchangeState,
  GroupedExchangesResponse,
  getStateLabel,
  getStateColor,
  STATE_OPTIONS,
  ALLOWED_TRANSITIONS,
} from "@/components/exchanges/types";
import { ExchangeForm } from "@/components/exchanges/exchange-form";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import api from "@/lib/api-sdk";

type Agent = {
  id: string;
  name: string;
  type: string;
};

type User = {
  id: string;
  email: string;
  agent?: Agent;
};

type ValueStream = {
  id: string;
  name: string;
  purpose?: string;
  children?: ValueStream[];
};

type Channel = {
  id: string;
  name: string;
  type: string;
  children?: Channel[];
};

type FlatValueStream = {
  id: string;
  name: string;
  level: number;
};

type FlatChannel = {
  id: string;
  name: string;
  level: number;
};

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

function flattenChannels(channels: Channel[], level = 0): FlatChannel[] {
  const result: FlatChannel[] = [];
  for (const channel of channels) {
    result.push({ id: channel.id, name: channel.name, level });
    if (channel.children && channel.children.length > 0) {
      result.push(...flattenChannels(channel.children, level + 1));
    }
  }
  return result;
}

const ExchangesPage = () => {
  const router = useRouter();
  const [data, setData] = useState<GroupedExchangesResponse | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<ExchangeState | "">("");
  const [valueStreamFilter, setValueStreamFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [leadUserFilter, setLeadUserFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("updatedAt_desc");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [valueStreams, setValueStreams] = useState<FlatValueStream[]>([]);
  const [channels, setChannels] = useState<FlatChannel[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingExchange, setEditingExchange] = useState<Exchange | null>(null);
  const [deletingExchange, setDeletingExchange] = useState<Exchange | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch filter data
  useEffect(() => {
    Promise.all([
      api.getAgents(1, 100),
      api.getUsers({ pageSize: 100 }),
      api.getValueStreams(),
      api.getChannelsTree(),
    ])
      .then(([agentsData, usersData, valueStreamsData, channelsData]) => {
        setAgents(agentsData?.items || []);
        setUsers(usersData?.items || []);
        setValueStreams(flattenValueStreams(valueStreamsData || []));
        setChannels(flattenChannels(channelsData || []));
      })
      .catch((error) => {
        console.error("Error fetching filter data:", error);
      });
  }, []);

  const agentOptions: AutocompleteOption[] = (agents || []).map((agent) => ({
    value: agent.id,
    label: agent.name,
    sublabel: agent.type,
  }));

  const userOptions: AutocompleteOption[] = (users || []).map((user) => ({
    value: user.id,
    label: user.email,
    sublabel: user.agent?.name,
  }));

  // Fetch exchanges
  const fetchExchanges = () => {
    api.getExchanges({
      q: search || undefined,
      state: stateFilter || undefined,
      valueStreamId: valueStreamFilter || undefined,
      channelId: channelFilter || undefined,
      agentId: agentFilter || undefined,
      leadUserId: leadUserFilter || undefined,
      sort,
    })
      .then((response) => {
        setData(response);
        // Expand all groups by default
        if (response.groups && response.groups.length > 0) {
          setExpandedGroups(new Set(response.groups.map((g: { valueStream: { id: string } }) => g.valueStream.id)));
        }
      })
      .catch((error) => {
        console.error("Error fetching exchanges:", error);
        toast.error("Failed to fetch exchanges");
      });
  };

  useEffect(() => {
    fetchExchanges();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExchanges();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchExchanges();
  }, [stateFilter, valueStreamFilter, channelFilter, agentFilter, leadUserFilter, sort]);

  const handleEdit = (exchange: Exchange) => {
    setEditingExchange(exchange);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingExchange) return;
    try {
      await api.deleteExchange(deletingExchange.id);
      toast.success("Exchange deleted successfully");
      fetchExchanges();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to delete exchange";
      toast.error(message);
    } finally {
      setDeletingExchange(null);
    }
  };

  const handleTransition = async (exchange: Exchange, to: ExchangeState) => {
    try {
      await api.transitionExchange(exchange.id, to);
      toast.success(`Exchange ${to === "completed" ? "completed" : "closed"}`);
      fetchExchanges();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to transition exchange";
      toast.error(message);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingExchange(null);
    fetchExchanges();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingExchange(null);
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedExchanges();
      toast.success(`Loaded ${result.exchanges} exchanges with ${result.flows} flows`);
      fetchExchanges();
      // Refresh filter data
      const [agentsData, usersData, valueStreamsData, channelsData] = await Promise.all([
        api.getAgents(1, 100),
        api.getUsers({ pageSize: 100 }),
        api.getValueStreams(),
        api.getChannelsTree(),
      ]);
      setAgents(agentsData.items);
      setUsers(usersData.items);
      setValueStreams(flattenValueStreams(valueStreamsData));
      setChannels(flattenChannels(channelsData));
    } catch {
      toast.error("Failed to load sample data");
    } finally {
      setIsSeeding(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (!data) {
    return <MarketlumDefaultSkeleton />;
  }

  const getTransitionIcon = (state: ExchangeState) => {
    switch (state) {
      case "completed":
        return <CheckCircle className="mr-2 h-4 w-4" />;
      case "closed":
        return <XCircle className="mr-2 h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTransitionLabel = (state: ExchangeState) => {
    switch (state) {
      case "completed":
        return "Mark Completed";
      case "closed":
        return "Close";
      default:
        return state;
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6" />
          EXCHANGES
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Loading..." : "Load sample data"}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Exchange
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exchanges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={stateFilter || "_all"}
          onValueChange={(value) => setStateFilter(value === "_all" ? "" : value as ExchangeState)}
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
          value={channelFilter || "_all"}
          onValueChange={(value) => setChannelFilter(value === "_all" ? "" : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All channels</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                <span style={{ paddingLeft: `${channel.level * 12}px` }}>
                  {channel.name}
                </span>
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

        <div className="w-[200px]">
          <Autocomplete
            options={userOptions}
            value={leadUserFilter}
            onChange={setLeadUserFilter}
            placeholder="Filter by lead..."
          />
        </div>

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
            <SelectItem value="createdAt_desc">Newest first</SelectItem>
            <SelectItem value="createdAt_asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped exchanges */}
      <div className="space-y-4">
        {!data.groups || data.groups.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No exchanges found. Create one to get started.
          </div>
        ) : (
          data.groups.map((group) => (
            <Collapsible
              key={group.valueStream.id}
              open={expandedGroups.has(group.valueStream.id)}
              onOpenChange={() => toggleGroup(group.valueStream.id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(group.valueStream.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <GitBranch className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold">{group.valueStream.name}</h2>
                      <Badge variant="secondary">{group.exchanges.length}</Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Parties</TableHead>
                        <TableHead>Flows</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.exchanges.map((exchange) => (
                        <TableRow
                          key={exchange.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/exchanges/${exchange.id}`)}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{exchange.name}</div>
                              {exchange.purpose && (
                                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {exchange.purpose}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStateColor(exchange.state)}>
                              {getStateLabel(exchange.state)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{exchange.parties?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <span>{exchange.flows?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {exchange.channel?.name || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {exchange.leadUser?.email || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/exchanges/${exchange.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {exchange.state === "open" && (
                                  <DropdownMenuItem onClick={() => handleEdit(exchange)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {ALLOWED_TRANSITIONS[exchange.state].map((targetState) => (
                                  <DropdownMenuItem
                                    key={targetState}
                                    onClick={() => handleTransition(exchange, targetState)}
                                  >
                                    {getTransitionIcon(targetState)}
                                    {getTransitionLabel(targetState)}
                                  </DropdownMenuItem>
                                ))}
                                {exchange.state === "open" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeletingExchange(exchange)}
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
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Total: {data.total ?? 0} exchanges
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleFormCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExchange ? "Edit Exchange" : "New Exchange"}</DialogTitle>
          </DialogHeader>
          <ExchangeForm
            exchange={editingExchange}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExchange} onOpenChange={() => setDeletingExchange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exchange</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingExchange?.name}&quot;?
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

export default ExchangesPage;
