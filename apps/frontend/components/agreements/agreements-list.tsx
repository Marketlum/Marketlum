"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Check,
  Undo,
  Download,
} from "lucide-react";
import {
  Agreement,
  getCategoryLabel,
  getGatewayLabel,
  getPartyRoleLabel,
  isAgreementOpen,
} from "./types";
import { format } from "date-fns";

type AgreementsListProps = {
  agreements: Agreement[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onEdit: (agreement: Agreement) => void;
  onDelete: (agreement: Agreement) => void;
  onAddChild: (parentId: string) => void;
  onToggleComplete: (agreement: Agreement) => void;
  onPageChange: (page: number) => void;
  isTree?: boolean;
};

function AgreementRow({
  agreement,
  depth = 0,
  onEdit,
  onDelete,
  onAddChild,
  onToggleComplete,
  expandedIds,
  toggleExpanded,
}: {
  agreement: Agreement;
  depth?: number;
  onEdit: (agreement: Agreement) => void;
  onDelete: (agreement: Agreement) => void;
  onAddChild: (parentId: string) => void;
  onToggleComplete: (agreement: Agreement) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  const hasChildren = agreement.children && agreement.children.length > 0;
  const isExpanded = expandedIds.has(agreement.id);
  const open = isAgreementOpen(agreement);

  return (
    <>
      <TableRow>
        <TableCell>
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${depth * 24}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(agreement.id)}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="font-medium">{agreement.title}</span>
            {agreement.childrenCount && agreement.childrenCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {agreement.childrenCount} annexes
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge
            variant={
              agreement.category === "internal_market" ? "secondary" : "default"
            }
          >
            {getCategoryLabel(agreement.category)}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={open ? "outline" : "default"}>
            {open ? "Open" : "Completed"}
          </Badge>
        </TableCell>
        <TableCell>{getGatewayLabel(agreement.gateway)}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {agreement.parties?.slice(0, 3).map((party) => (
              <Badge key={party.id} variant="outline" className="text-xs">
                {party.agent?.name}
                {party.role && (
                  <span className="text-muted-foreground ml-1">
                    ({getPartyRoleLabel(party.role)})
                  </span>
                )}
              </Badge>
            ))}
            {agreement.parties && agreement.parties.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{agreement.parties.length - 3} more
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {agreement.completedAt
            ? format(new Date(agreement.completedAt), "MMM d, yyyy")
            : "-"}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {agreement.link && (
              <a
                href={agreement.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                title="Open link"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {agreement.file && (
              <a
                href={`http://localhost:3001/files/${agreement.file.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                title={`Download: ${agreement.file.originalName}`}
              >
                <FileText className="h-4 w-4" />
              </a>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(agreement)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddChild(agreement.id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Annex
              </DropdownMenuItem>
              {agreement.file && (
                <DropdownMenuItem asChild>
                  <a
                    href={`http://localhost:3001/files/${agreement.file.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onToggleComplete(agreement)}>
                {open ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Mark Completed
                  </>
                ) : (
                  <>
                    <Undo className="mr-2 h-4 w-4" />
                    Reopen
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(agreement)}
                className="text-destructive"
                disabled={hasChildren}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isExpanded &&
        agreement.children?.map((child) => (
          <AgreementRow
            key={child.id}
            agreement={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onToggleComplete={onToggleComplete}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
          />
        ))}
    </>
  );
}

export function AgreementsList({
  agreements,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onEdit,
  onDelete,
  onAddChild,
  onToggleComplete,
  onPageChange,
  isTree = false,
}: AgreementsListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (agreements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No agreements found. Create an agreement to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Gateway</TableHead>
            <TableHead>Parties</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Links</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agreements.map((agreement) => (
            <AgreementRow
              key={agreement.id}
              agreement={agreement}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onToggleComplete={onToggleComplete}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </TableBody>
      </Table>

      {!isTree && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
            agreements
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
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
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
