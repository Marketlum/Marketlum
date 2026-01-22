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
  Boxes,
  Pencil,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Users,
  Diamond,
  GitBranch,
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Calendar,
} from "lucide-react";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import {
  ValueInstance,
  getDirectionLabel,
  getVisibilityLabel,
} from "@/components/value-instances/types";
import { ValueInstanceForm } from "@/components/value-instances/value-instance-form";
import { ValueTypeBadge } from "@/components/value/value-type-badge";
import { ValueType } from "@/components/value/types";
import api from "@/lib/api-sdk";

const getDirectionIcon = (direction: string) => {
  switch (direction) {
    case "incoming":
      return <ArrowDownLeft className="h-4 w-4" />;
    case "outgoing":
      return <ArrowUpRight className="h-4 w-4" />;
    case "internal":
      return <RefreshCw className="h-4 w-4" />;
    default:
      return <Minus className="h-4 w-4" />;
  }
};

const ValueInstanceDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [instance, setInstance] = useState<ValueInstance | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInstance = () => {
    api.getValueInstance(id)
      .then((data) => setInstance(data))
      .catch((error) => {
        console.error("Error fetching value instance:", error);
        toast.error("Failed to fetch value instance");
        router.push("/value-instances");
      });
  };

  useEffect(() => {
    fetchInstance();
  }, [id]);

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchInstance();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteValueInstance(id);
      toast.success("Value instance deleted");
      router.push("/value-instances");
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || "Failed to delete value instance";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!instance) {
    return <MarketlumDefaultSkeleton />;
  }

  return (
    <div className="flex flex-col space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/value-instances")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Boxes className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{instance.name}</h1>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            {getDirectionIcon(instance.direction)}
            {getDirectionLabel(instance.direction)}
          </Badge>
          <Badge variant={instance.visibility === "public" ? "default" : "secondary"}>
            {instance.visibility === "public" ? (
              <Eye className="h-3 w-3 mr-1" />
            ) : (
              <EyeOff className="h-3 w-3 mr-1" />
            )}
            {getVisibilityLabel(instance.visibility)}
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
          {instance.purpose && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Purpose</label>
              <p>{instance.purpose}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <Diamond className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Value</label>
                <p>{instance.value?.name || "Unknown"}</p>
                {instance.value?.type && (
                  <ValueTypeBadge type={instance.value.type as ValueType} className="mt-1 text-xs" />
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Version</label>
                <p>{instance.version}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p>{new Date(instance.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Updated</label>
                <p>{new Date(instance.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          {instance.link && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium text-muted-foreground">Link:</label>
              <a
                href={instance.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {instance.link}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agents Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agents
          </CardTitle>
          <CardDescription>Agents involved in this value instance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-muted-foreground">From Agent</label>
              </div>
              {instance.fromAgent ? (
                <p className="font-medium">{instance.fromAgent.name}</p>
              ) : (
                <p className="text-muted-foreground">Not specified</p>
              )}
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-muted-foreground">To Agent</label>
              </div>
              {instance.toAgent ? (
                <p className="font-medium">{instance.toAgent.name}</p>
              ) : (
                <p className="text-muted-foreground">Not specified</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchy Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Hierarchy
          </CardTitle>
          <CardDescription>Parent and child instances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parent */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Parent Instance</label>
            {instance.parent ? (
              <div
                className="mt-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/value-instances/${instance.parent!.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{instance.parent.name}</span>
                  <Badge variant="outline">{instance.parent.version}</Badge>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">No parent (root instance)</p>
            )}
          </div>

          {/* Children */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Child Instances ({instance.children?.length || 0})
            </label>
            {instance.children && instance.children.length > 0 ? (
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instance.children.map((child) => (
                    <TableRow
                      key={child.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/value-instances/${child.id}`)}
                    >
                      <TableCell className="font-medium">{child.name}</TableCell>
                      <TableCell>{child.version}</TableCell>
                      <TableCell>
                        <Badge variant={child.visibility === "public" ? "default" : "secondary"}>
                          {getVisibilityLabel(child.visibility)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="mt-2 text-muted-foreground">No child instances</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Card */}
      {instance.imageFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video max-w-md rounded-lg overflow-hidden border">
              <img
                src={instance.imageFile.url}
                alt={instance.name}
                className="object-cover w-full h-full"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{instance.imageFile.filename}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => !open && setShowEditForm(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Value Instance</DialogTitle>
          </DialogHeader>
          <ValueInstanceForm
            instance={instance}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Value Instance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{instance.name}&quot;?
              {instance.children && instance.children.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This instance has {instance.children.length} child instance(s).
                  You must delete or reassign them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || (instance.children && instance.children.length > 0)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ValueInstanceDetailsPage;
