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

export function MarketlumValueStreamSelector(props) {
    const [valueStreams, setValueStreams] = useState([]);

    useEffect(() => {
        async function fetchOptions() {
            setValueStreams(await api.getValueStreams());
        }
        fetchOptions();
    }, []);

    let depth = 1;

    function renderChildren(valueStream) {
        const indent = "---";

        if (valueStream.children.length > 0) {
            depth++;

            return valueStream.children.map((child) => (
                <>
                    <SelectItem key={child.id} value={child.id}>{indent.repeat(depth)} {child.name}</SelectItem>
                    {renderChildren(child)}
                </>
            ))
         } else {
            depth--;

            if (depth < 0) { depth = 0; }
         }
    }

    return (
        <>
            <Select onValueChange={props.onChange}
            defaultValue={props.value}
            value={props.value}
            {...props}>
            <SelectTrigger>
                <SelectValue placeholder="Select parent value stream" />
            </SelectTrigger>
            <SelectContent position="popper">
            {valueStreams.map((valueStream) => (
                <>
                    <SelectItem key={valueStream.id} value={valueStream.id}>{valueStream.name}</SelectItem>
                    {renderChildren(valueStream)}
                </>
            ))}
            </SelectContent>
            </Select>
        </>
    )
}