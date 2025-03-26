import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketlumValueListItem(props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{props.details.name}</CardTitle>
                <CardDescription>{props.details.purpose}</CardDescription>
            </CardHeader>
            <CardContent>
                <p>{props.details.description}</p>
            </CardContent>
            <CardFooter>
            </CardFooter>
        </Card>
    )
}