import api from "@/lib/api-sdk";
import { useState, useEffect } from "react";
import { MarketlumValueListItem } from "./item";

export function MarketlumValueList(props) {
    const streamId = props.streamId;
    const [values, setValues] = useState([]);
    useEffect(() => {
        async function fetchValues() {
            const values = await api.getFlatValue(streamId);
            setValues(values);
        }
        fetchValues();
    }, [streamId]);
    return (
        <div>
            {values.map((value) => { return <MarketlumValueListItem details={value} />})}
        </div>
    )
}