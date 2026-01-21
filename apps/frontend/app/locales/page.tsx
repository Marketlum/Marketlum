"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton"
import { LocaleForm } from "@/components/locales/form"
import { LocaleFlag } from "@/components/locales/locale-flag"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Languages, Search, Database } from "lucide-react"
import { useDebounce } from "use-debounce"

import api from "@/lib/api-sdk"

type Locale = {
  id: string
  code: string
  createdAt: string
}

type PaginatedResponse = {
  data: Locale[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const LocalesPage = () => {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch] = useDebounce(searchQuery, 300)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingLocale, setEditingLocale] = useState<Locale | null>(null)
  const [deletingLocale, setDeletingLocale] = useState<Locale | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const fetchLocales = useCallback((page: number = currentPage, size: number = pageSize, q?: string) => {
    api.getLocales({ page, pageSize: size, q: q || undefined, sort: 'createdAt_desc' })
      .then((response) => setData(response))
      .catch((error) => console.error("Error fetching locales:", error))
  }, [currentPage, pageSize])

  useEffect(() => {
    fetchLocales(currentPage, pageSize, debouncedSearch)
  }, [currentPage, pageSize, debouncedSearch, fetchLocales])

  const handleCreateSubmit = () => {
    setShowCreateForm(false)
    setCurrentPage(1)
    fetchLocales(1, pageSize, debouncedSearch)
  }

  const handleEditSubmit = () => {
    setEditingLocale(null)
    fetchLocales(currentPage, pageSize, debouncedSearch)
  }

  const handleDelete = async () => {
    if (!deletingLocale) return

    try {
      setIsDeleting(true)
      await api.deleteLocale(deletingLocale.id)
      toast.success("Locale deleted successfully.")
      // If we deleted the last item on this page, go to previous page
      if (data && data.data.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      } else {
        fetchLocales(currentPage, pageSize, debouncedSearch)
      }
    } catch {
      toast.error("Failed to delete locale.")
    } finally {
      setIsDeleting(false)
      setDeletingLocale(null)
    }
  }

  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10)
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleSeed = async () => {
    try {
      setIsSeeding(true)
      const result = await api.seedLocales()
      if (result.inserted > 0) {
        toast.success(`Seeded ${result.inserted} locales. ${result.skipped} already existed.`)
        fetchLocales(1, pageSize, debouncedSearch)
        setCurrentPage(1)
      } else {
        toast.info("All seed locales already exist.")
      }
    } catch {
      toast.error("Failed to seed locales.")
    } finally {
      setIsSeeding(false)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (data && currentPage < Math.ceil(data.total / pageSize)) {
      setCurrentPage(currentPage + 1)
    }
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!data) return <MarketlumDefaultSkeleton />

  return (
    <div className="flex flex-col space-y-3">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Languages className="h-6 w-6" />
          LOCALES
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding} data-testid="seed-locales-button">
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Seeding..." : "Load Seed Data"}
          </Button>
          <Button onClick={() => setShowCreateForm(true)} data-testid="create-locale-button">
            <Plus className="mr-2 h-4 w-4" />
            Add Locale
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            data-testid="locale-search"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[80px]" data-testid="page-size-selector">
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
      </div>

      <Dialog open={showCreateForm || !!editingLocale} onOpenChange={(open) => {
        if (!open) {
          setShowCreateForm(false)
          setEditingLocale(null)
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLocale ? "Edit Locale" : "Create Locale"}</DialogTitle>
          </DialogHeader>
          <LocaleForm
            locale={editingLocale || undefined}
            onFormSubmit={editingLocale ? handleEditSubmit : handleCreateSubmit}
          />
        </DialogContent>
      </Dialog>

      <Table>
        <TableCaption>List of locales supported in your market.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Code</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                {searchQuery ? "No locales found matching your search." : "No locales yet. Create one to get started."}
              </TableCell>
            </TableRow>
          ) : (
            data.data.map((locale) => (
              <TableRow key={locale.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <LocaleFlag code={locale.code} />
                    <span className="font-mono">{locale.code}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(locale.createdAt)}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateForm(false)
                      setEditingLocale(locale)
                    }}
                    data-testid={`edit-locale-${locale.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingLocale(locale)}
                    data-testid={`delete-locale-${locale.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to{" "}
            {Math.min(currentPage * pageSize, data.total)} of{" "}
            {data.total} locales
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              data-testid="pagination-previous"
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
              data-testid="pagination-next"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingLocale} onOpenChange={() => setDeletingLocale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Locale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the locale &quot;{deletingLocale?.code}&quot;? This action cannot be undone.
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
  )
}

export default LocalesPage
