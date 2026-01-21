"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton"
import { AgentForm } from "@/components/agents/form"
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Users } from "lucide-react"

import api from "@/lib/api-sdk"

type Agent = {
  id: string
  name: string
  type: string
}

type PaginationMeta = {
  itemCount: number
  totalItems: number
  itemsPerPage: number
  totalPages: number
  currentPage: number
}

type PaginatedResponse = {
  items: Agent[]
  meta: PaginationMeta
}

const ITEMS_PER_PAGE = 5

const AgentsPage = () => {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchAgents = (page: number = currentPage) => {
    api.getAgents(page, ITEMS_PER_PAGE)
      .then((data) => setData(data))
      .catch((error) => console.error("Error fetching data:", error))
  }

  useEffect(() => {
    fetchAgents(currentPage)
  }, [currentPage])

  const handleCreateSubmit = () => {
    setShowCreateForm(false)
    setCurrentPage(1)
    fetchAgents(1)
  }

  const handleEditSubmit = () => {
    setEditingAgent(null)
    fetchAgents(currentPage)
  }

  const handleDelete = async () => {
    if (!deletingAgent) return

    try {
      setIsDeleting(true)
      await api.deleteAgent(deletingAgent.id)
      toast.success("Agent deleted successfully.")
      // If we deleted the last item on this page, go to previous page
      if (data && data.items.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      } else {
        fetchAgents(currentPage)
      }
    } catch (error) {
      toast.error("Failed to delete agent.")
    } finally {
      setIsDeleting(false)
      setDeletingAgent(null)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (data && currentPage < data.meta.totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  if (!data) return <MarketlumDefaultSkeleton />

  return (
    <div className="flex flex-col space-y-3">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          AGENTS
        </h1>
        <Button onClick={() => setShowCreateForm(true)} data-testid="create-agent-button">
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </header>

      {showCreateForm && (
        <AgentForm onFormSubmit={handleCreateSubmit} />
      )}

      {editingAgent && (
        <AgentForm agent={editingAgent} onFormSubmit={handleEditSubmit} />
      )}

      <Table>
        <TableCaption>List of agents participating in your market.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{agent.type}</Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingAgent(agent)
                  }}
                  data-testid={`edit-agent-${agent.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingAgent(agent)}
                  data-testid={`delete-agent-${agent.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, data.meta.totalItems)} of{" "}
            {data.meta.totalItems} agents
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
              Page {currentPage} of {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === data.meta.totalPages}
              data-testid="pagination-next"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingAgent} onOpenChange={() => setDeletingAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAgent?.name}&quot;? This action cannot be undone.
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

export default AgentsPage
