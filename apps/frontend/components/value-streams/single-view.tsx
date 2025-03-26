"use client"

import api from "@/lib/api-sdk";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export function MarketlumValueStreamsSingleView() {
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
        <>
            <div>
                <h1>{valueStream.name}</h1>
            </div>
        </>
    )
}