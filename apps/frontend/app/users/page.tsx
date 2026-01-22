"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { UserForm } from "@/components/users/form";
import { SetPasswordDialog } from "@/components/users/set-password-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Search,
  Database,
  Key,
  UserX,
  UserCheck,
} from "lucide-react";
import { useDebounce } from "use-debounce";
import axios from "axios";

import api from "@/lib/api-sdk";
import { User, PaginatedUsersResponse } from "@/components/users/types";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest first" },
  { value: "createdAt_asc", label: "Oldest first" },
  { value: "email_asc", label: "Email A-Z" },
  { value: "email_desc", label: "Email Z-A" },
];

const UsersPage = () => {
  const [data, setData] = useState<PaginatedUsersResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt_desc");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [settingPasswordUser, setSettingPasswordUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  const fetchUsers = useCallback(
    (page: number = currentPage, size: number = pageSize, q?: string) => {
      const isActive = activeFilter === "all" ? undefined : activeFilter === "active";
      api
        .getUsers({
          page,
          pageSize: size,
          q: q || undefined,
          isActive,
          sort: sortBy,
        })
        .then((response) => setData(response))
        .catch((error) => console.error("Error fetching users:", error));
    },
    [currentPage, pageSize, activeFilter, sortBy]
  );

  useEffect(() => {
    fetchUsers(currentPage, pageSize, debouncedSearch);
  }, [currentPage, pageSize, debouncedSearch, activeFilter, sortBy, fetchUsers]);

  const handleCreateSubmit = () => {
    setShowCreateForm(false);
    setCurrentPage(1);
    fetchUsers(1, pageSize, debouncedSearch);
  };

  const handleEditSubmit = () => {
    setEditingUser(null);
    fetchUsers(currentPage, pageSize, debouncedSearch);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      setIsDeleting(true);
      await api.deleteUser(deletingUser.id);
      toast.success("User deleted successfully.");
      if (data && data.data.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchUsers(currentPage, pageSize, debouncedSearch);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete user.");
      }
    } finally {
      setIsDeleting(false);
      setDeletingUser(null);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      setIsToggling(user.id);
      const newIsActive = !user.isActive;
      await api.updateUser(user.id, {
        isActive: newIsActive,
        leftAt: !newIsActive ? new Date().toISOString().split("T")[0] : null,
      });
      toast.success(`User ${newIsActive ? "activated" : "deactivated"} successfully.`);
      fetchUsers(currentPage, pageSize, debouncedSearch);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update user.");
      }
    } finally {
      setIsToggling(null);
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleActiveFilterChange = (value: string) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedUsers();
      if (result.inserted > 0) {
        toast.success(
          `Seeded ${result.inserted} users. ${result.skipped} already existed.`
        );
        fetchUsers(1, pageSize, debouncedSearch);
        setCurrentPage(1);
      } else {
        toast.info("All seed users already exist.");
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to seed users.");
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (data && currentPage < Math.ceil(data.total / pageSize)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const calculateAge = (birthday: string | null): number | null => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const needsPagination = data ? data.total > pageSize : false;

  if (!data) return <MarketlumDefaultSkeleton />;

  return (
    <div className="flex flex-col space-y-3">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          USERS
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Loading..." : "Load sample data"}
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={activeFilter} onValueChange={handleActiveFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[150px]">
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
        {needsPagination && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Dialog
        open={showCreateForm || !!editingUser}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateForm(false);
            setEditingUser(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <UserForm
            user={editingUser || undefined}
            onFormSubmit={editingUser ? handleEditSubmit : handleCreateSubmit}
          />
        </DialogContent>
      </Dialog>

      <SetPasswordDialog
        user={settingPasswordUser}
        open={!!settingPasswordUser}
        onOpenChange={(open) => !open && setSettingPasswordUser(null)}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Avatar</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Locale</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                {searchQuery
                  ? "No users found matching your search."
                  : "No users yet. Create one to get started."}
              </TableCell>
            </TableRow>
          ) : (
            data.data.map((user) => {
              const age = calculateAge(user.birthday);
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      {user.avatarFileId ? (
                        <AvatarImage
                          src={`${apiBaseUrl}/files/${user.avatarFileId}/thumbnail`}
                          alt={user.email}
                        />
                      ) : null}
                      <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.email}
                    {age !== null && (
                      <span className="ml-2 text-muted-foreground text-sm">({age} years old)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{user.defaultLocale?.code || "-"}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.joinedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(user)}
                      disabled={isToggling === user.id}
                      title={user.isActive ? "Deactivate" : "Activate"}
                    >
                      {user.isActive ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSettingPasswordUser(user)}
                      title="Set Password"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingUser(user);
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingUser(user)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, data.total)} of {data.total} users
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user &quot;{deletingUser?.email}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;
