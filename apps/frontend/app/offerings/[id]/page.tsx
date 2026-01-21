"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShoppingCart,
  Pencil,
  Trash2,
  MoreHorizontal,
  Plus,
  ExternalLink,
  Play,
  Archive,
  RotateCcw,
  Package,
  FileText,
  Link as LinkIcon,
  Calendar,
  Users,
  GitBranch,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import {
  Offering,
  OfferingItem,
  OfferingState,
  getStateLabel,
  getStateColor,
  isOfferingActive,
  ALLOWED_TRANSITIONS,
} from "@/components/offerings/types";
import { OfferingForm } from "@/components/offerings/offering-form";
import { OfferingItemForm } from "@/components/offerings/offering-item-form";
import api from "@/lib/api-sdk";

type FileUpload = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

const OfferingDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [offering, setOffering] = useState<Offering | null>(null);
  const [availableFiles, setAvailableFiles] = useState<FileUpload[]>([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<OfferingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<OfferingItem | null>(null);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [removingFile, setRemovingFile] = useState<FileUpload | null>(null);

  const fetchOffering = () => {
    api.getOffering(id)
      .then((data) => setOffering(data))
      .catch((error) => {
        console.error("Error fetching offering:", error);
        toast.error("Failed to fetch offering");
        router.push("/offerings");
      });
  };

  useEffect(() => {
    fetchOffering();
    api.getFiles({ page: 1, limit: 100 })
      .then((data) => setAvailableFiles(data.items))
      .catch((error) => console.error("Error fetching files:", error));
  }, [id]);

  const handleTransition = async (to: OfferingState) => {
    try {
      await api.transitionOffering(id, to);
      toast.success(`Offering ${to === "live" ? "published" : to === "archived" ? "archived" : "moved to draft"}`);
      fetchOffering();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to transition offering";
      toast.error(message);
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchOffering();
  };

  // Item handlers
  const handleEditItem = (item: OfferingItem) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    try {
      await api.removeOfferingItem(id, deletingItem.id);
      toast.success("Item removed successfully");
      fetchOffering();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to remove item";
      toast.error(message);
    } finally {
      setDeletingItem(null);
    }
  };

  const handleItemFormSuccess = () => {
    setShowItemForm(false);
    setEditingItem(null);
    fetchOffering();
  };

  const handleItemFormCancel = () => {
    setShowItemForm(false);
    setEditingItem(null);
  };

  // File handlers
  const handleAttachFile = async () => {
    if (!selectedFileId) return;
    try {
      await api.attachOfferingFile(id, selectedFileId);
      toast.success("File attached successfully");
      setShowFileSelector(false);
      setSelectedFileId("");
      fetchOffering();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to attach file";
      toast.error(message);
    }
  };

  const handleRemoveFile = async () => {
    if (!removingFile) return;
    try {
      await api.removeOfferingFile(id, removingFile.id);
      toast.success("File removed successfully");
      fetchOffering();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to remove file";
      toast.error(message);
    } finally {
      setRemovingFile(null);
    }
  };

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

  if (!offering) {
    return <MarketlumDefaultSkeleton />;
  }

  const attachedFileIds = new Set(offering.files?.map((f) => f.id) || []);
  const unattachedFiles = availableFiles.filter((f) => !attachedFileIds.has(f.id));

  return (
    <div className="flex flex-col space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/offerings")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{offering.name}</h1>
          </div>
          <Badge variant={getStateColor(offering.state)}>
            {getStateLabel(offering.state)}
          </Badge>
          {offering.state === "live" && isOfferingActive(offering) && (
            <Badge variant="default" className="bg-green-600">Active</Badge>
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
              {ALLOWED_TRANSITIONS[offering.state].map((targetState) => (
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
          {offering.purpose && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Purpose</label>
              <p>{offering.purpose}</p>
            </div>
          )}
          {offering.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="whitespace-pre-wrap">{offering.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Agent</label>
                <p>{offering.agent?.name || "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Value Stream</label>
                <p>{offering.valueStream?.name || "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Active From</label>
                <p>{offering.activeFrom ? new Date(offering.activeFrom).toLocaleDateString() : "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Active Until</label>
                <p>{offering.activeUntil ? new Date(offering.activeUntil).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          </div>
          {offering.link && (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <a
                href={offering.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {offering.link}
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
              Items ({offering.items?.length || 0})
            </CardTitle>
            <CardDescription>Values included in this offering</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowItemForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {offering.items && offering.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Value</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Pricing Formula</TableHead>
                  <TableHead>Pricing Link</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offering.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.value?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.value?.type || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground truncate block max-w-[150px]">
                        {item.pricingFormula || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.pricingLink ? (
                        <a
                          href={item.pricingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Link <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
                            onClick={() => setDeletingItem(item)}
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
              No items yet. Add items to include values in this offering.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Files Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Files ({offering.files?.length || 0})
            </CardTitle>
            <CardDescription>Documents attached to this offering</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowFileSelector(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Attach File
          </Button>
        </CardHeader>
        <CardContent>
          {offering.files && offering.files.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offering.files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">{file.originalName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{file.mimeType.split("/")[1]}</Badge>
                    </TableCell>
                    <TableCell>{(file.sizeBytes / 1024).toFixed(1)} KB</TableCell>
                    <TableCell>{new Date(file.uploadedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={api.getFileDownloadUrl(file.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRemovingFile(file)}
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
              No files attached. Attach files to provide additional documentation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Offering Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => !open && setShowEditForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Offering</DialogTitle>
          </DialogHeader>
          <OfferingForm
            offering={offering}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Item Form Dialog */}
      <Dialog open={showItemForm} onOpenChange={(open) => !open && handleItemFormCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <OfferingItemForm
            offeringId={id}
            item={editingItem}
            onSuccess={handleItemFormSuccess}
            onCancel={handleItemFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* File Selector Dialog */}
      <Dialog open={showFileSelector} onOpenChange={(open) => !open && setShowFileSelector(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedFileId} onValueChange={setSelectedFileId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a file to attach" />
              </SelectTrigger>
              <SelectContent>
                {unattachedFiles.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    No available files
                  </SelectItem>
                ) : (
                  unattachedFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.originalName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFileSelector(false)}>
                Cancel
              </Button>
              <Button onClick={handleAttachFile} disabled={!selectedFileId}>
                Attach
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{deletingItem?.value?.name}&quot; from this offering?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove File Confirmation */}
      <AlertDialog open={!!removingFile} onOpenChange={() => setRemovingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{removingFile?.originalName}&quot; from this offering?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFile}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OfferingDetailsPage;
