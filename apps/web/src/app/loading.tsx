import { ServiceListSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-24 min-h-[70vh]">
      <div className="max-w-xl mx-auto text-center mb-16">
        <Skeleton className="h-4 w-32 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-10 w-3/4 mx-auto mb-4 rounded-xl" />
        <Skeleton className="h-5 w-full mx-auto rounded-lg" />
      </div>
      <ServiceListSkeleton count={6} />
    </div>
  );
}
