"use client";

import { useState, useEffect, useCallback } from "react";
import CedearCard from "@/components/CedearCard";
import CclBanner from "@/components/CclBanner";
import { fetchMarketData } from "@/services/market";
import { RefreshCw, Clock, TrendingUp, AlertCircle } from "lucide-react";

const REFRESH_MS = 60_000;

export default function HomePage() {
  const [data, setData] = useState({ cedears: [], ccl: null, errors: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(60);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const result = await fetchMarketData();
      setData(result);
      setLastUpdate(new Date());
      setCountdown(60);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 60), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const noUSA = !loading && data.cedears.length > 0 && data.cedears.every(c => c.precioUSA === null);

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── ENCABEZADO ── */}
      <header className="bg-white border-b-2 border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2.5 rounded-2xl">
              <TrendingUp size={26} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Mis CEDEARs</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Contador */}
            {!loading && (
              <div className="hidden sm:flex items-center gap-2 text-base text-slate-400 font-semibold bg-slate-100 px-4 py-2 rounded-full">
                <Clock size={16} />
                <span>{countdown}s</span>
              </div>
            )}

            {/* Botón actualizar */}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 bg-slate-900 text-white text-lg font-bold
                px-5 py-2.5 rounded-2xl hover:bg-slate-700
                active:scale-95 transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{refreshing ? "Actualizando…" : "Actualizar"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── CCL ── */}
        <CclBanner ccl={data.ccl} loading={loading} />

        {/* ── AVISO SIN DATOS USA ── */}
        {noUSA && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex gap-4 items-start">
            <AlertCircle size={24} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-lg font-bold text-amber-800 mb-1">
                Precios de acciones USA no disponibles
              </p>
              <p className="text-base text-amber-700 leading-relaxed">
                Necesitás configurar una API key gratuita de Finnhub.<br />
                Ir a <span>&quot;finnhub.io&quot;</span> → <span>&quot;Get free API key&quot;</span> → agregar en{" "}
                <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-sm">.env.local</code>:{" "}
                <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-sm">FINNHUB_API_KEY=tu_key</code>{" "}
                → reiniciar con{" "}
                <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-sm">npm run dev</code>
              </p>
            </div>
          </div>
        )}

        {/* ── ERRORES ── */}
        {data.errors.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex gap-3 items-start">
            <AlertCircle size={22} className="text-red-400 shrink-0 mt-0.5" />
            <ul className="text-base text-red-700 space-y-1">
              {data.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        )}

        {/* ── GRID DE CARDS ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-3xl border-2 border-slate-200 p-6 animate-pulse space-y-4">
                <div className="h-10 bg-slate-200 rounded-xl w-32" />
                <div className="h-5 bg-slate-100 rounded-xl w-48" />
                <div className="border-t-2 border-slate-100" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-20" />
                    <div className="h-8 bg-slate-200 rounded-xl w-full" />
                    <div className="h-5 bg-slate-100 rounded w-16" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-20" />
                    <div className="h-8 bg-slate-200 rounded-xl w-full" />
                    <div className="h-5 bg-slate-100 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {data.cedears.map((cedear, i) => (
              <div
                key={cedear.symbol}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                <CedearCard cedear={cedear} ccl={data.ccl} />
              </div>
            ))}
          </div>
        )}

        {/* ── ÚLTIMA ACTUALIZACIÓN ── */}
        {lastUpdate && (
          <p className="text-center text-base text-slate-400 font-semibold pt-1">
            Actualizado a las{" "}
            {lastUpdate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        )}

        {/* ── AVISO LEGAL ── */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 text-center">
          <p className="text-base text-slate-500 leading-relaxed">
            ⚠️ Los precios de CEDEARs son de BYMA con <strong>~20 minutos de demora</strong>.<br />
            Los precios de acciones USA tienen <strong>~15 minutos de demora</strong>.<br />
          </p>
        </div>

      </main>
    </div>
  );
}