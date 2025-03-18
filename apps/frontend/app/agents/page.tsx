"use client"

import { Badge } from "@/components/ui/badge"

import { AppSkeleton } from "@/components/app-skeleton";

import { useEffect, useState } from "react";

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"

const AgentsPage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/agents")
      .then((response) => response.json())
      .then((data) => setData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  if (!data) return (
    <AppSkeleton />
  )

  return (
    <div className="flex flex-col space-y-3">
        <header className="flex flex-col space-y-3">
            <h1 className="text-2xl font-bold">AGENTS</h1>
        </header>
    <Table>
        <TableCaption>List of agents participating in your market.</TableCaption>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[100px]">Name</TableHead>
                <TableHead>Type</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.items.map((agent) => (
            <TableRow>
                <TableCell className="font-medium">{agent.name}</TableCell>
                <TableCell><Badge variant="outline">{agent.type}</Badge></TableCell>
            </TableRow>
            ))}
        </TableBody>
    </Table>
    </div>
  );
};

export default AgentsPage;