"use client"

import { Skeleton } from "@/components/ui/skeleton"

import { useEffect, useState } from "react";

const ValuePage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/value")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  if (!data) return (
    <div className="flex flex-col space-y-3">
        <Skeleton className="h-[250px] w-[450px] rounded-xl" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
        </div>
    </div>
  )

  return (
    <div>Value Tree Loaded</div>
  );
};

export default ValuePage;
