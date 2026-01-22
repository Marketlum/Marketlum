"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Diamond, TreePine, List, Circle, Database, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import api from "@/lib/api-sdk";
import axios from "axios";

type ValueLayoutProps = {
  children: React.ReactNode;
};

export default function ValueLayout({ children }: ValueLayoutProps) {
  const pathname = usePathname();
  const [isSeeding, setIsSeeding] = useState(false);

  // Determine current view from pathname
  const currentView = pathname.includes("/tree")
    ? "tree"
    : pathname.includes("/list")
    ? "list"
    : pathname.includes("/bubbles")
    ? "bubbles"
    : "tree";

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedValues();
      toast.success(`Seeded ${result.inserted} values (${result.skipped} skipped).`);
      // Trigger a page refresh to reload data
      window.location.reload();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to seed values.");
      }
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Diamond className="h-6 w-6" />
          VALUE
        </h1>
        <div className="flex items-center gap-4">
          <Tabs value={currentView}>
            <TabsList>
              <TabsTrigger value="tree" asChild>
                <Link href="/value/tree" className="flex items-center gap-2">
                  <TreePine className="h-4 w-4" />
                  Tree
                </Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link href="/value/list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </Link>
              </TabsTrigger>
              <TabsTrigger value="bubbles" asChild>
                <Link href="/value/bubbles" className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  Bubbles
                </Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            <Database className="mr-2 h-4 w-4" />
            {isSeeding ? "Loading..." : "Load sample data"}
          </Button>
<Link href={currentView === "bubbles" ? "/value/tree?add=true" : `/value/${currentView}?add=true`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Value
            </Button>
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
