"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgreementStats } from "./types";
import { FileCheck, FileX, Files } from "lucide-react";

type StatsCardsProps = {
  stats: AgreementStats;
  activeFilter?: "open" | "completed" | null;
  onFilterClick: (filter: "open" | "completed" | null) => void;
};

export function StatsCards({ stats, activeFilter, onFilterClick }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
          activeFilter === "open" ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => onFilterClick(activeFilter === "open" ? null : "open")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Agreements</CardTitle>
          <FileX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.openCount}</div>
          <p className="text-xs text-muted-foreground">
            Pending completion
          </p>
        </CardContent>
      </Card>

      <Card
        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
          activeFilter === "completed" ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => onFilterClick(activeFilter === "completed" ? null : "completed")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completedCount}</div>
          <p className="text-xs text-muted-foreground">
            Finalized agreements
          </p>
        </CardContent>
      </Card>

      <Card className="cursor-default">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <Files className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCount}</div>
          <p className="text-xs text-muted-foreground">
            All agreements
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
