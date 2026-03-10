"use client";

import { formatARS, formatUSD, formatPct } from "@/services/market";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function Variacion({ value }) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className="text-gray-400 text-xl font-semibold">—</span>;
  }
  const pos = value > 0;
  const neu = value === 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xl font-bold tabular-nums
        ${neu ? "text-gray-400" : pos ? "text-green-700" : "text-red-600"}`}
    >
      {neu ? <Minus size={18} /> : pos ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      {formatPct(value)}
    </span>
  );
}

export default function CedearCard({ cedear, ccl }) {
  const { symbol, name, precioCedear, variacionCedear, precioUSA, variacionUSA, cclImplicito, error, estimado } = cedear;

  return (
    <article className={`
      bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5
      ${error ? "opacity-60" : ""}
    `}>

      {/* Encabezado */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900">{symbol}</h2>
          <p className="text-lg text-gray-500 font-medium mt-0.5">{name}</p>
        </div>
        {error && (
          <span className="text-sm font-bold text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
            Sin datos
          </span>
        )}
      </div>

      {/* Precios: filas, mobile first */}
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">CEDEAR (ARS)</p>
          <p className="text-2xl font-black text-gray-900 tabular-nums mt-1">
            {precioCedear !== null ? formatARS(precioCedear) : "—"}
          </p>
          <Variacion value={variacionCedear} />
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Acción USA</p>
          <p className="text-2xl font-black text-gray-900 tabular-nums mt-1">
            {precioUSA !== null ? formatUSD(precioUSA) : "—"}
          </p>
          <Variacion value={variacionUSA} />
        </div>

        {cclImplicito !== null && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
            <span className="text-base font-semibold text-blue-700">CCL implícito</span>
            <span className="text-lg font-black text-blue-900 tabular-nums">{formatUSD(cclImplicito)}</span>
          </div>
        )}
      </div>
    </article>
  );
}