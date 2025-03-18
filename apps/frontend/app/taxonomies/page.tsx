"use client"

import { AppSkeleton } from "@/components/app-skeleton";
import { AppTaxonomiesTree } from "@/components/app-taxonomies-tree";
import { AppTaxonomiesForm } from "@/components/taxonomies/app-taxonomies-form";

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
    <AppSkeleton />
  )

  return (
      <div className="grid grid-cols-4 grid-rows-1 gap-4">
          <div >
            <AppTaxonomiesTree data={data} />
          </div>
          <div className="col-span-3">
            <AppTaxonomiesForm />
          </div>
      </div>
  );
};

export default TaxonomiesPage;
