"use client"

import { MarketlumDefaultSkeleton } from "@/components/default-skeleton";
import { MarketlumTaxonomiesTree } from "@/components/taxonomies/tree";
import { MarketlumTaxonomiesForm } from "@/components/taxonomies/form";

import { useEffect, useState } from "react";

const TaxonomiesPage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/taxonomies")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  if (!data) return (
    <MarketlumDefaultSkeleton />
  )

  return (
      <div className="grid grid-cols-4 grid-rows-1 gap-4">
          <div >
            <MarketlumTaxonomiesTree data={data} />
          </div>
          <div className="col-span-3">
            <MarketlumTaxonomiesForm />
          </div>
      </div>
  );
};

export default TaxonomiesPage;
