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
  FileText,
  Pencil,
  Trash2,
  MoreHorizontal,
  Plus,
  ExternalLink,
  Users,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Link as LinkIcon,
  Paperclip,
  Package,
  Boxes,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { Invoice, InvoiceItem, formatDate, isOverdue } from "@/components/invoices/types";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { InvoiceItemForm } from "@/components/invoices/invoice-item-form";
import api from "@/lib/api-sdk";

const InvoiceDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [removingItem, setRemovingItem] = useState<InvoiceItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInvoice = () => {
    api.getInvoice(id)
      .then((data) => setInvoice(data))
      .catch((error) => {
        console.error("Error fetching invoice:", error);
        toast.error("Failed to fetch invoice");
        router.push("/invoices");
      });
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchInvoice();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteInvoice(id);
      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete invoice");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Item handlers
  const handleEditItem = (item: InvoiceItem) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleRemoveItem = async () => {
    if (!removingItem) return;
    try {
      await api.removeInvoiceItem(id, removingItem.id);
      toast.success("Item removed");
      fetchInvoice();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to remove item");
    } finally {
      setRemovingItem(null);
    }
  };

  const handleItemFormSuccess = () => {
    setShowItemForm(false);
    setEditingItem(null);
    fetchInvoice();
  };

  const handleItemFormCancel = () => {
    setShowItemForm(false);
    setEditingItem(null);
  };

  if (!invoice) {
    return <MarketlumDefaultSkeleton />;
  }

  const overdue = isOverdue(invoice.dueAt);

  return (
    <div className="flex flex-col space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/invoices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{invoice.number}</h1>
          </div>
          {overdue && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </Badge>
          )}
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
              <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
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
          {/* Agents */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">From</label>
              <p className="font-medium">{invoice.fromAgent?.name || "Unknown"}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">To</label>
              <p className="font-medium">{invoice.toAgent?.name || "Unknown"}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Issued</label>
                <p>{formatDate(invoice.issuedAt)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Due</label>
                <p className={overdue ? "text-destructive font-medium" : ""}>
                  {formatDate(invoice.dueAt)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p>{formatDate(invoice.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Updated</label>
                <p>{formatDate(invoice.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Note */}
          {invoice.note && (
            <div className="pt-2 border-t">
              <label className="text-sm font-medium text-muted-foreground">Note</label>
              <p className="mt-1">{invoice.note}</p>
            </div>
          )}

          {/* Link */}
          {invoice.link && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium text-muted-foreground">Link:</label>
              <a
                href={invoice.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {invoice.link}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* File */}
          {invoice.file && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium text-muted-foreground">File:</label>
              <a
                href={invoice.file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {invoice.file.filename}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items ({invoice.items?.length || 0})
            </CardTitle>
            <CardDescription>Values and value instances on this invoice</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowItemForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {invoice.items && invoice.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.valueId ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Package className="h-3 w-3" />
                          Value
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Boxes className="h-3 w-3" />
                          Instance
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.value?.name || item.valueInstance?.name || "Unknown"}
                      {item.value?.type && (
                        <span className="text-muted-foreground ml-2">({item.value.type})</span>
                      )}
                      {item.valueInstance?.value && (
                        <span className="text-muted-foreground ml-2">
                          ({item.valueInstance.value.name})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.description || "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditItem(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRemovingItem(item)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No items yet. Add values or value instances to this invoice.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Invoice Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => !open && setShowEditForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={invoice}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Item Form Dialog */}
      <Dialog open={showItemForm} onOpenChange={(open) => !open && handleItemFormCancel()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <InvoiceItemForm
            invoiceId={id}
            item={editingItem}
            onSuccess={handleItemFormSuccess}
            onCancel={handleItemFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice &quot;{invoice.number}&quot;?
              This will also delete all items on this invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Item Confirmation */}
      <AlertDialog open={!!removingItem} onOpenChange={() => setRemovingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from the invoice?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveItem}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoiceDetailsPage;
