"use client"

import { HandHeart } from "lucide-react"

import MarketlumValueStreamsTree from "@/components/value-streams/tree"
import { MarketlumValueStreamsForm } from "@/components/value-streams/form"
import { MarketlumTreeSkeleton } from "@/components/tree-skeleton"
import { useState, useEffect } from "react";

import api from "@/lib/api-sdk";

export function MarketlumValueStreamsView() {
    const [valueStreams, setValueStreams] = useState([]);
    const [treeSeed, setTreeSeed] = useState(Math.random());
    const [treeLoading, setTreeLoading] = useState(true);

    function refreshTree() {
        setTreeSeed(Math.random());
    }

    useEffect(() => {
        async function fetchTree() {
            setTreeLoading(true);
            await api.getValueStreams().then(setValueStreams);
            setTreeLoading(false);
        }
        fetchTree();
    }, [treeSeed]);

    return (
        <>
            <div className="grid grid-cols-4 grid-rows-1 gap-4">
                <div className="col-span-1">
                    {treeLoading ? <MarketlumTreeSkeleton /> : <MarketlumValueStreamsTree data={valueStreams} />}
                </div>
                <div className="col-span-3">
                    <MarketlumValueStreamsForm onFormSubmit={refreshTree} />
                </div>
            </div>
        </>
    )
}