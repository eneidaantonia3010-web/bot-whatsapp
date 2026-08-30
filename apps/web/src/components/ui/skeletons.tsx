import { Skeleton } from "./skeleton";

export function ServiceCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/50 p-6 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <Skeleton className="h-7 w-3/5 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2 rounded" />
      <Skeleton className="h-4 w-4/5 mb-6 rounded" />
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function ServiceListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BookingCalendarSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-surface/60 p-6 md:p-8 backdrop-blur-md">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-6 text-center">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full rounded" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <Skeleton className="h-12 w-40 rounded-xl" />
      </div>
    </div>
  );
}

export function AdminMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-surface/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32 mb-2 rounded-lg" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 gap-4">
            <Skeleton className="h-5 w-1/4 rounded" />
            <Skeleton className="h-5 w-1/5 rounded" />
            <Skeleton className="h-5 w-1/6 rounded" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
