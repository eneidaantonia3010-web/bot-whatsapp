"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught an exception:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center p-8 rounded-3xl border border-white/10 bg-surface/80 backdrop-blur-xl shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-6 text-2xl">
          ✨
        </div>
        <h2 className="text-2xl font-serif font-medium text-white mb-3">
          Algo no salió como esperábamos
        </h2>
        <p className="text-sm text-ink-muted mb-6 leading-relaxed">
          {error.message || "Tuvimos un inconveniente al cargar esta página. Por favor, intentá nuevamente."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-black font-medium text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-full border border-white/15 text-white font-medium text-sm hover:bg-white/5 active:scale-95 transition-all"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
