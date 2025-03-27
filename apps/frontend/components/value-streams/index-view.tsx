"use client"

import { HandHeart } from "lucide-react"

import MarketlumValueStreamsTree from "@/components/value-streams/tree"
import { MarketlumValueStreamsForm } from "@/components/value-streams/form"
import { MarketlumTreeSkeleton } from "@/components/tree-skeleton"
import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";

import api from "@/lib/api-sdk";
import { toast } from "sonner"

export function MarketlumValueStreamsView() {
    function refreshTree() {
        mutate('/value-streams');
    }

    const fetcher = () => api.getValueStreams();
    const { data, error, isLoading } = useSWR('/value-streams', fetcher);

    if (error) {
        toast.error("Cannot load the value streams tree.");
    }

    return (
        <>
            <div className="grid grid-cols-3 grid-rows-1 gap-4">
                <div className="col-span-1">
                    {isLoading ? <MarketlumTreeSkeleton /> : <MarketlumValueStreamsTree data={data} />}
                </div>
                <div className="col-span-2">
                    <MarketlumValueStreamsForm onFormSubmit={refreshTree} />
                </div>
            </div>
        </>
    )
}