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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Database,
  ArrowRight,
  Paperclip,
  AlertTriangle,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { Invoice, SORT_OPTIONS, formatDate, isOverdue } from "@/components/invoices/types";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import api from "@/lib/api-sdk";

type Agent = { id: string; name: string };

const InvoicesPage = () => {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [fromAgentId, setFromAgentId] = useState("");
  const [toAgentId, setToAgentId] = useState("");
  const [sort, setSort] = useState("issuedAt_desc");

  // Dialogs
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Fetch agents for filters
  useEffect(() => {
    api.getAgents(1, 100)
      .then((data) => setAgents(data.items || []))
      .catch((error) => console.error("Error fetching agents:", error));
  }, []);

  // Fetch invoices
  const fetchInvoices = () => {
    setIsLoading(true);
    api.getInvoices({
      q: search || undefined,
      fromAgentId: fromAgentId || undefined,
      toAgentId: toAgentId || undefined,
      sort,
      page,
      pageSize,
    })
      .then((data) => {
        setInvoices(data.data || []);
        setTotal(data.total || 0);
      })
      .catch((error) => {
        console.error("Error fetching invoices:", error);
        toast.error("Failed to load invoices");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, fromAgentId, toAgentId, sort, page]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await api.seedInvoices();
      toast.success(`Created ${result.created} sample invoices`);
      fetchInvoices();
    } catch (error) {
      toast.error("Failed to seed invoices");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    try {
      await api.deleteInvoice(deletingInvoice.id);
      toast.success("Invoice deleted");
      fetchInvoices();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete invoice");
    } finally {
      setDeletingInvoice(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingInvoice(null);
    fetchInvoices();
  };

  const totalPages = Math.ceil(total / pageSize);

  if (isLoading && invoices.length === 0) {
    return <MarketlumDefaultSkeleton />;
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Track invoices between agents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Seeding..." : "Load sample data"}
          </Button>
          <Button onClick={() => { setEditingInvoice(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={fromAgentId || "all"} onValueChange={(v) => setFromAgentId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="From Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All From Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={toAgentId || "all"} onValueChange={(v) => setToAgentId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="To Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All To Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>From / To</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-center">File</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No invoices found. Create one or load sample data.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {invoice.number}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <span>{invoice.fromAgent?.name || "Unknown"}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{invoice.toAgent?.name || "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {formatDate(invoice.dueAt)}
                      {isOverdue(invoice.dueAt) && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{invoice.itemsCount || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {invoice.fileId && <Paperclip className="h-4 w-4 mx-auto text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(invoice); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setDeletingInvoice(invoice); }}
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
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingInvoice(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditingInvoice(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingInvoice} onOpenChange={() => setDeletingInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice &quot;{deletingInvoice?.number}&quot;?
              This will also delete all items on this invoice.
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

export default InvoicesPage;
