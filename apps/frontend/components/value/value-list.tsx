"use client";

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
import { Pencil, Trash2, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import { Value, getValueTypeLabel, getParentTypeLabel } from "./types";
import { ValueTypeIcon } from "./icons";

type ValueListProps = {
  values: Value[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onEdit: (value: Value) => void;
  onDelete: (value: Value) => void;
  onPageChange: (page: number) => void;
};

export function ValueList({
  values,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onEdit,
  onDelete,
  onPageChange,
}: ValueListProps) {
  if (values.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No values yet. Add a value to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Parent Type</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Files</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {values.map((value) => (
            <TableRow key={value.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <ValueTypeIcon type={value.type} className="h-4 w-4" />
                  {value.name}
                </div>
              </TableCell>
              <TableCell>
                {value.description ? (
                  <span className="text-muted-foreground text-sm truncate max-w-[200px] block">
                    {value.description}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getValueTypeLabel(value.type)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{getParentTypeLabel(value.parentType)}</Badge>
              </TableCell>
              <TableCell>
                {(value as any).parent ? (
                  <span className="text-sm">{(value as any).parent.name}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {value.files && value.files.length > 0 ? (
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Paperclip className="h-3 w-3" />
                    {value.files.length}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(value)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(value)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
            {totalItems} values
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
