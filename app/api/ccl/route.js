/**
 * app/api/ccl/route.js
 *
 * Cotización del dólar CCL (Contado Con Liquidación).
 *
 * El CCL es el tipo de cambio implícito que surge de comprar un activo
 * en pesos en Argentina y venderlo en dólares en el exterior.
 * Se puede verificar con cualquier CEDEAR:
 *   CCL_implícito = (precioCedear × ratio) / precioUSA
 *
 * Fuentes en cascada:
 *   1. DolarAPI   — dolarapi.com/v1/dolares/contadoconliqui
 *   2. ArgentinaDatos — api.argentinadatos.com/v1/cotizaciones/dolares/contadoconliqui
 *   3. Ámbito     — mercados.ambito.com/dolarrava/cl/variacion
 */

import { NextResponse } from "next/server";

let cache = { data: null, timestamp: 0 };
const TTL = 55_000;
const UA  = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// El CCL históricamente ha estado entre 100 y 5000 ARS/USD
// Si una fuente devuelve algo fuera de ese rango, la descartamos
const isValid = (v) => typeof v === "number" && !isNaN(v) && v >= 100 && v <= 5000;

const toF = (v) => parseFloat(String(v ?? "0").replace(",", ".")) || 0;

async function fetchDolarAPI() {
  try {
    const r = await fetch("https://dolarapi.com/v1/dolares/contadoconliqui", {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j      = await r.json();
    const venta  = toF(j?.venta);
    const compra = toF(j?.compra);
    if (!isValid(venta)) throw new Error(`Valor inválido: ${venta}`);
    const promedio = compra > 0 ? (venta + compra) / 2 : venta;
    return { venta, compra, promedio, fecha: j?.fechaActualizacion?.split("T")[0] ?? null, fuente: "DolarAPI" };
  } catch (e) {
    console.warn("[ccl] DolarAPI:", e.message);
    return null;
  }
}

async function fetchArgentinaDatos() {
  try {
    const r = await fetch("https://api.argentinadatos.com/v1/cotizaciones/dolares/contadoconliqui", {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j    = await r.json();
    const last = Array.isArray(j) ? j[j.length - 1] : j;
    const venta  = toF(last?.venta);
    const compra = toF(last?.compra);
    if (!isValid(venta)) throw new Error(`Valor inválido: ${venta}`);
    const promedio = compra > 0 ? (venta + compra) / 2 : venta;
    return { venta, compra, promedio, fecha: last?.fecha ?? null, fuente: "ArgentinaDatos" };
  } catch (e) {
    console.warn("[ccl] ArgentinaDatos:", e.message);
    return null;
  }
}

async function fetchAmbito() {
  try {
    const r = await fetch("https://mercados.ambito.com/dolarrava/cl/variacion", {
      headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://www.ambito.com/" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j      = await r.json();
    const venta  = toF(j?.venta);
    const compra = toF(j?.compra);
    if (!isValid(venta)) throw new Error(`Valor inválido: ${venta}`);
    const promedio = compra > 0 ? (venta + compra) / 2 : venta;
    return { venta, compra, promedio, fecha: new Date().toISOString().split("T")[0], fuente: "Ámbito" };
  } catch (e) {
    console.warn("[ccl] Ámbito:", e.message);
    return null;
  }
}

export async function GET() {
  try {
    if (cache.data && Date.now() - cache.timestamp < TTL) {
      return NextResponse.json(cache.data);
    }

    const ccl =
      (await fetchDolarAPI()) ??
      (await fetchArgentinaDatos()) ??
      (await fetchAmbito());

    if (!ccl) {
      return NextResponse.json(
        { error: "No se pudo obtener el CCL", venta: null, compra: null, promedio: null },
        { status: 503 }
      );
    }

    const response = {
      venta:    parseFloat(ccl.venta.toFixed(2)),
      compra:   parseFloat(ccl.compra.toFixed(2)),
      promedio: parseFloat(ccl.promedio.toFixed(2)),
      fecha:    ccl.fecha,
      fuente:   ccl.fuente,
      updatedAt: new Date().toISOString(),
    };

    console.log(`[ccl] OK: ${ccl.fuente} — promedio ARS ${response.promedio}`);
    cache = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[ccl] Error general:", err);
    return NextResponse.json(
      { error: "Error al obtener el CCL", detail: err.message },
      { status: 500 }
    );
  }
}
