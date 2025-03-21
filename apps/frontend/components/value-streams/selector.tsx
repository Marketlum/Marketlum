import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function MarketlumValueStreamSelector() {
    return (
        <>
            <Label htmlFor="valueStream">Parent</Label>
            <Select>
            <SelectTrigger id="framework">
                <SelectValue placeholder="Select parent value stream" />
            </SelectTrigger>
            <SelectContent position="popper">
                <SelectItem value="next">Next.js</SelectItem>
            </SelectContent>
            </Select>
        </>
    )
}