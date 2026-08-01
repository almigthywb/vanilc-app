import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("motion-skeleton", className)} />;
}

/** Grelha de indicadores (dashboard) */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-12 w-12 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-2/3" />
              <SkeletonBlock className="h-5 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Linhas de tabela */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((__, c) => (
            <SkeletonBlock key={c} className={cn("h-4 flex-1", c === 0 && "max-w-[80px]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grelha de cards (produtos / categorias) */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <SkeletonBlock className="mb-3 aspect-square w-full rounded-xl" />
          <SkeletonBlock className="mb-2 h-4 w-3/4" />
          <SkeletonBlock className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Lista simples (pedidos, clientes) */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
        >
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-3 w-1/4" />
          </div>
          <SkeletonBlock className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
