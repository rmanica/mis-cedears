"use client";

import { formatARS } from "@/services/market";
import { DollarSign } from "lucide-react";

export default function CclBanner({ ccl, loading }) {
  if (loading || !ccl || ccl.error) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-sm px-5 py-4 max-w-md mx-auto mb-4 space-y-4">

      {/* Icono + label */}
      <div className="flex items-center gap-2">
        <DollarSign size={24} className="text-slate-200" />
        <span className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
          Dólar CCL
        </span>
      </div>

      {/* Promedio */}
      <div className="text-3xl font-extrabold text-white tabular-nums">
        {formatARS(ccl.promedio)}
      </div>

      {/* Compra / Venta */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-center">
          <span className="block text-sm text-slate-500 font-semibold">Compra</span>
          <span className="block text-xl font-bold text-slate-900 tabular-nums">{formatARS(ccl.compra)}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-center">
          <span className="block text-sm text-slate-500 font-semibold">Venta</span>
          <span className="block text-xl font-bold text-slate-900 tabular-nums">{formatARS(ccl.venta)}</span>
        </div>
      </div>

      {/* Fuente y fecha */}
      <div className="text-right text-xs text-slate-300">
        {ccl.fuente && <div>{ccl.fuente}</div>}
        {ccl.fecha && <div>{ccl.fecha}</div>}
      </div>
    </div>
  );
}