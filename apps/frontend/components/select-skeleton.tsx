import { Skeleton } from "./ui/skeleton"

export const MarketlumSelectSkeleton = () => {
    return (
    <div className="flex flex-col space-y-3">
        <Skeleton className="h-[25px] w-[200px] rounded-xl" />
    </div>
  )
}