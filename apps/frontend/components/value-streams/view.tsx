"use client"

import { HandHeart } from "lucide-react"

import { MarketlumValueStreamsTree } from "@/components/value-streams/tree"
import { MarketlumValueStreamsForm } from "@/components/value-streams/form"

import { useState, useEffect } from "react";

import api from "@/lib/api-sdk";

export function MarketlumValueStreamsView() {
    const [valueStreams, setValueStreams] = useState([]);

    useEffect(() => {
        api.getValueStreams().then(setValueStreams);
    }, []);

    return (
        <MarketlumValueStreamsTree data={valueStreams} />
    )
}