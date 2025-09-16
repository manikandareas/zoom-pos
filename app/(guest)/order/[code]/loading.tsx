import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingOrderPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-24 pt-10">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    </div>
  );
}
