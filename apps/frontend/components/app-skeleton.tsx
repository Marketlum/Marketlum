import { Skeleton } from "./ui/skeleton"

export const AppSkeleton = () => {
    return (
    <div className="flex flex-col space-y-3">
        <Skeleton className="h-[400px] w-[800px] rounded-xl" />
        <div className="space-y-2">
            <Skeleton className="h-4 h-[50px] w-[250px]" />
            <Skeleton className="h-4 w-[250px]" />
        </div>
    </div>
  )
}