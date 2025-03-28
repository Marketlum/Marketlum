import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Check, Cross, Pencil, X } from "lucide-react"
import { useEffect, useState } from "react"

import api from "@/lib/api-sdk"
import { toast } from "sonner"

export default function MarketlumEditableValueStreamName(props) {
    const [ editable, setEditable ] = useState(false);
    const [ name, setName ] = useState();

    // @todo: Remove this hack.
    useEffect(() => {
        setName(props.name);
    }, [props.name])

    async function handleUpdate() {
        if (await api.updateValueStream(props.id, {name: name})) {
            toast.success("Name successfully updated.");
            setEditable(false);
        } else {
            toast.error("Cannot update name of this value stream.");
        }
    }

    if (editable) {
        return (
            <>
                <Input type="text" defaultValue={name} onChange={(event) => setName(event.target.value)} className="w-sm" />
                <Button size="icon" variant="outline" onClick={() => setEditable(false)}><X /></Button>
                <Button size="icon" variant="outline" onClick={handleUpdate}><Check /></Button>
            </>
        )
    } else {
        return (
            <>
                <h1 className="text-2xl font-bold">{name} <Button size="icon" variant="outline" onClick={() => setEditable(true)}><Pencil /></Button></h1>
            </>
        )
    }
}