"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Error Boundary caught an exception:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full p-8 rounded-3xl border border-white/10 bg-surface/90 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3 mb-4 text-amber-400">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            ⚠️
          </div>
          <h2 className="text-xl font-semibold text-white">Error en Panel de Administración</h2>
        </div>
        <p className="text-sm text-ink-muted mb-6 leading-relaxed">
          {error.message || "Ocurrió un error inesperado al procesar los datos administrativos."}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-primary text-black font-medium text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
          >
            Reintentar carga
          </button>
          <Link
            href="/admin"
            className="px-5 py-2.5 rounded-xl border border-white/15 text-white font-medium text-sm hover:bg-white/5 active:scale-95 transition-all"
          >
            Refrescar Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
