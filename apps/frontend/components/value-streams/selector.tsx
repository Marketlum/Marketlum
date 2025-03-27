"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { MarketlumSelectSkeleton } from "@/components/select-skeleton"

import api from "@/lib/api-sdk"

import useSWR from "swr"

export function MarketlumValueStreamSelector(props) {
    const fetcher = () => api.getValueStreams();
    const { data, error, isLoading } = useSWR('/value-streams', fetcher);

    if (error) {
        toast.error("Cannot load the value streams tree.");
    }

    if (isLoading) {
        return <MarketlumSelectSkeleton /> 
    }

    function renderChildren(valueStream) {
        if (valueStream.children.length > 0) {

            return valueStream.children.map((child) => (
                <>
                    <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                    {renderChildren(child)}
                </>
            ))
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
            {data.map((valueStream) => (
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