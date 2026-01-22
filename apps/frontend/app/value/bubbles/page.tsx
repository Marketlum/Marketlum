"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { ValueBubbleChart } from "@/components/value/bubble-chart";
import { Value } from "@/components/value/types";
import api from "@/lib/api-sdk";

const ValueBubblesPage = () => {
  const router = useRouter();
  const [treeValues, setTreeValues] = useState<Value[] | null>(null);

  useEffect(() => {
    api.getValuesTree()
      .then((data) => setTreeValues(data))
      .catch((error) => console.error("Error fetching values:", error));
  }, []);

  if (!treeValues) return <MarketlumDefaultSkeleton />;

  return (
    <div className="border rounded-lg overflow-hidden flex-1" style={{ minHeight: "calc(100vh - 220px)" }}>
      <ValueBubbleChart
        values={treeValues}
        onSwitchToList={() => router.push("/value/list")}
      />
    </div>
  );
};

export default ValueBubblesPage;
