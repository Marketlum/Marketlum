"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowLeftRight,
  Pencil,
  Trash2,
  MoreHorizontal,
  Plus,
  ExternalLink,
  CheckCircle,
  XCircle,
  Users,
  GitBranch,
  ArrowRight,
  FileText,
  Network,
  User,
  Calendar,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import {
  Exchange,
  ExchangeState,
  ExchangeParty,
  ExchangeFlow,
  getStateLabel,
  getStateColor,
  ALLOWED_TRANSITIONS,
} from "@/components/exchanges/types";
import { ExchangeForm } from "@/components/exchanges/exchange-form";
import { PartyForm } from "@/components/exchanges/party-form";
import { FlowForm } from "@/components/exchanges/flow-form";
import { CreateAgreementForm } from "@/components/exchanges/create-agreement-form";
import api from "@/lib/api-sdk";

const ExchangeDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ExchangeFlow | null>(null);
  const [removingParty, setRemovingParty] = useState<ExchangeParty | null>(null);
  const [removingFlow, setRemovingFlow] = useState<ExchangeFlow | null>(null);

  const fetchExchange = () => {
    api.getExchange(id)
      .then((data) => setExchange(data))
      .catch((error) => {
        console.error("Error fetching exchange:", error);
        toast.error("Failed to fetch exchange");
        router.push("/exchanges");
      });
  };

  useEffect(() => {
    fetchExchange();
  }, [id]);

  const handleTransition = async (to: ExchangeState) => {
    try {
      await api.transitionExchange(id, to);
      toast.success(`Exchange ${to === "completed" ? "completed" : "closed"}`);
      fetchExchange();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to transition exchange";
      toast.error(message);
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchExchange();
  };

  // Party handlers
  const handleRemoveParty = async () => {
    if (!removingParty || !exchange) return;
    try {
      const remainingParties = exchange.parties
        .filter((p) => p.id !== removingParty.id)
        .map((p) => ({ agentId: p.agentId }));
      await api.setExchangeParties(id, remainingParties);
      toast.success("Party removed successfully");
      fetchExchange();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to remove party";
      toast.error(message);
    } finally {
      setRemovingParty(null);
    }
  };

  const handlePartyFormSuccess = () => {
    setShowPartyForm(false);
    fetchExchange();
  };

  // Flow handlers
  const handleEditFlow = (flow: ExchangeFlow) => {
    setEditingFlow(flow);
    setShowFlowForm(true);
  };

  const handleRemoveFlow = async () => {
    if (!removingFlow) return;
    try {
      await api.removeExchangeFlow(id, removingFlow.id);
      toast.success("Flow removed successfully");
      fetchExchange();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to remove flow";
      toast.error(message);
    } finally {
      setRemovingFlow(null);
    }
  };

  const handleFlowFormSuccess = () => {
    setShowFlowForm(false);
    setEditingFlow(null);
    fetchExchange();
  };

  const handleFlowFormCancel = () => {
    setShowFlowForm(false);
    setEditingFlow(null);
  };

  // Agreement handler
  const handleAgreementSuccess = () => {
    setShowAgreementForm(false);
    fetchExchange();
    toast.success("Agreement created and linked to exchange");
  };

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

  if (!exchange) {
    return <MarketlumDefaultSkeleton />;
  }

  const isEditable = exchange.state === "open";

  return (
    <div className="flex flex-col space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/exchanges")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{exchange.name}</h1>
          </div>
          <Badge variant={getStateColor(exchange.state)}>
            {getStateLabel(exchange.state)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions
                <MoreHorizontal className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isEditable && (
                <>
                  <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {!exchange.agreementId && isEditable && (
                <>
                  <DropdownMenuItem onClick={() => setShowAgreementForm(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Agreement
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {ALLOWED_TRANSITIONS[exchange.state].map((targetState) => (
                <DropdownMenuItem
                  key={targetState}
                  onClick={() => handleTransition(targetState)}
                >
                  {getTransitionIcon(targetState)}
                  {getTransitionLabel(targetState)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exchange.purpose && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Purpose</label>
              <p>{exchange.purpose}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Value Stream</label>
                <p>{exchange.valueStream?.name || "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Network className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Channel</label>
                <p>{exchange.channel?.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Taxonomy</label>
                <p>{exchange.taxon?.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lead User</label>
                <p>{exchange.leadUser?.email || "—"}</p>
              </div>
            </div>
          </div>
          {exchange.agreement && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium text-muted-foreground">Linked Agreement:</label>
              <a
                href={`/agreements/${exchange.agreement.id}`}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {exchange.agreement.title}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {(exchange.completedAt || exchange.closedAt) && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              {exchange.completedAt && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Completed At</label>
                    <p>{new Date(exchange.completedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {exchange.closedAt && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Closed At</label>
                    <p>{new Date(exchange.closedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parties Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parties ({exchange.parties?.length || 0})
            </CardTitle>
            <CardDescription>Agents involved in this exchange</CardDescription>
          </div>
          {isEditable && (
            <Button size="sm" onClick={() => setShowPartyForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {exchange.parties && exchange.parties.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Added</TableHead>
                  {isEditable && <TableHead className="w-[80px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchange.parties.map((party) => (
                  <TableRow key={party.id}>
                    <TableCell className="font-medium">{party.agent?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{party.agent?.type || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell>{new Date(party.createdAt).toLocaleDateString()}</TableCell>
                    {isEditable && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => setRemovingParty(party)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No parties yet. Add agents as parties to this exchange.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Flows Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Flows ({exchange.flows?.length || 0})
            </CardTitle>
            <CardDescription>Value movements between parties</CardDescription>
          </div>
          {isEditable && exchange.parties && exchange.parties.length >= 2 && (
            <Button size="sm" onClick={() => setShowFlowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Flow
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {exchange.parties && exchange.parties.length < 2 ? (
            <p className="text-center text-muted-foreground py-8">
              Add at least 2 parties to create value flows.
            </p>
          ) : exchange.flows && exchange.flows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead></TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Note</TableHead>
                  {isEditable && <TableHead className="w-[80px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchange.flows.map((flow) => (
                  <TableRow key={flow.id}>
                    <TableCell className="font-medium">
                      {flow.fromPartyAgent?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {flow.toPartyAgent?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{flow.value?.name || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {flow.quantity ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground truncate block max-w-[150px]">
                        {flow.note || "—"}
                      </span>
                    </TableCell>
                    {isEditable && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditFlow(flow)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRemovingFlow(flow)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No flows yet. Add flows to define value movements between parties.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Exchange Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => !open && setShowEditForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Exchange</DialogTitle>
          </DialogHeader>
          <ExchangeForm
            exchange={exchange}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Party Form Dialog */}
      <Dialog open={showPartyForm} onOpenChange={(open) => !open && setShowPartyForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Party</DialogTitle>
          </DialogHeader>
          <PartyForm
            exchangeId={id}
            existingPartyAgentIds={exchange.parties?.map((p) => p.agentId) || []}
            onSuccess={handlePartyFormSuccess}
            onCancel={() => setShowPartyForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Flow Form Dialog */}
      <Dialog open={showFlowForm} onOpenChange={(open) => !open && handleFlowFormCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFlow ? "Edit Flow" : "Add Flow"}</DialogTitle>
          </DialogHeader>
          <FlowForm
            exchangeId={id}
            parties={exchange.parties || []}
            flow={editingFlow}
            onSuccess={handleFlowFormSuccess}
            onCancel={handleFlowFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Create Agreement Dialog */}
      <Dialog open={showAgreementForm} onOpenChange={(open) => !open && setShowAgreementForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Agreement from Exchange</DialogTitle>
          </DialogHeader>
          <CreateAgreementForm
            exchangeId={id}
            exchangeName={exchange.name}
            onSuccess={handleAgreementSuccess}
            onCancel={() => setShowAgreementForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Remove Party Confirmation */}
      <AlertDialog open={!!removingParty} onOpenChange={() => setRemovingParty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Party</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{removingParty?.agent?.name}&quot; from this exchange?
              This will also remove any flows involving this party.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveParty}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Flow Confirmation */}
      <AlertDialog open={!!removingFlow} onOpenChange={() => setRemovingFlow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this flow?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFlow}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExchangeDetailsPage;
