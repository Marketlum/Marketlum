"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useState, useEffect } from "react"

import api from "@/lib/api-sdk"

export function MarketlumValueStreamSelector() {
    const [valueStreams, setValueStreams] = useState([]);

    useEffect(async () => {
        setValueStreams(await api.getValueStreams());
    }, []);

    console.log(valueStreams);

    return (
        <>
            <Select>
            <SelectTrigger id="parentId">
                <SelectValue placeholder="Select parent value stream" />
            </SelectTrigger>
            <SelectContent position="popper">
            {valueStreams.map((valueStream) => (
                <SelectItem value={valueStream.id}>{valueStream.name}</SelectItem>
            ))}
            </SelectContent>
            </Select>
        </>
    )
}