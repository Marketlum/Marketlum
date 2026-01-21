import api from "@/lib/api-sdk";
import { useState, useEffect } from "react";
import { MarketlumValueListItem } from "./item";

interface ValueListProps {
    streamId: string;
}

interface Value {
    id: string;
    name: string;
    [key: string]: unknown;
}

export function MarketlumValueList({ streamId }: ValueListProps) {
    const [values, setValues] = useState<Value[]>([]);
    useEffect(() => {
        async function fetchValues() {
            const values = await api.getFlatValue(streamId);
            setValues(values);
        }
        fetchValues();
    }, [streamId]);
    return (
        <div>
            {values.map((value) => { return <MarketlumValueListItem key={value.id} details={value} />})}
        </div>
    )
}