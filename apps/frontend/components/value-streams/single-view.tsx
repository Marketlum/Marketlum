"use client"

import api from "@/lib/api-sdk";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

import { MarketlumValueList } from "@/components/value/list";
import MarketlumEditableValueStreamName from "./editable-name";

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
            <MarketlumEditableValueStreamName name={valueStream.name} id={valueStream.id} />
            <p className="text-sm text-muted-foreground">{valueStream.purpose}</p>
            <MarketlumValueList streamId={id} />
        </div>
    )
}