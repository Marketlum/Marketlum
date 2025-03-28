"use client"

import api from "@/lib/api-sdk";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

import { MarketlumValueList } from "@/components/value/list";
import MarketlumEditableValueStreamName from "./editable-name";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  } from "@/components/ui/breadcrumb"

export function MarketlumValueStreamView() {
    const params = useParams();
    const id = params.id as string;

    const [valueStream, setValueStream] = useState({});

    useEffect(() => {
        async function fetchValueStream() {
            const valueStream = await api.getValueStream(id);
            setValueStream(valueStream);
        }
        fetchValueStream();
    }, [id]);

    return (
        <div>
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/value-streams">Value Streams</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{valueStream.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <MarketlumEditableValueStreamName name={valueStream.name} id={valueStream.id} />
            <p className="text-sm text-muted-foreground">{valueStream.purpose}</p>

            <MarketlumValueList streamId={id} />
        </div>
    )
}