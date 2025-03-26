import { Skeleton } from "./ui/skeleton"

export const MarketlumTreeSkeleton = () => {
    return (
    <div className="flex flex-col space-y-3">
        <Skeleton className="h-[500px] w-[200px] rounded-xl" />
        <div className="space-y-2">
            <Skeleton className="h-4 h-[50px] w-[200px]" />
            <Skeleton className="h-4 h-[50px] w-[200px]" />
            <Skeleton className="h-4 w-[200px]" />
        </div>
    </div>
  )
}