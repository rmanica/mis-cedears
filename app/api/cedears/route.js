/**
 * app/api/cedears/route.js
 *
 * Lógica:
 *   1. Rava panel HTML → precio real de BYMA en ARS (estimado: false)
 *   2. Si Rava falla → Finnhub: (precio_USD / ratio) × CCL → precio estimado en ARS (estimado: true)
 *
 * Fórmula del estimado:
 *   precio_estimado_ARS = (precio_USD / ratio) × CCL_promedio
 *
 *   Donde ratio = cuántos CEDEARs equivalen a 1 acción (X:1).
 *   Ej: MELI ratio=120 → 1 CEDEAR = 1/120 acción. precio = 1769/120 × 1450 = ARS 21.381
 *       Si MELI = USD 14,75 y CCL = 1.450 → precio estimado = 14,75 × 20 × 1.450 = ARS 428.050
 *
 * Nota: si Rava funciona, los precios son los reales de BYMA (~20 min de demora).
 * Si es estimado, puede diferir del precio real por el spread del CCL implícito.
 */

import { NextResponse } from "next/server";
import { CEDEARS } from "@/data/cedears";

let cache = { data: null, timestamp: 0 };
const TTL = 55_000;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const toNum = (s) => {
  if (!s) return null;
  const n = parseFloat(String(s).trim().replace(/\./g, "").replace(",", "."));
  return isNaN(n) || n <= 0 ? null : n;
};

// ─── FUENTE 1: Rava panel HTML ────────────────────────────────────────────────
async function fetchRavaPanel() {
  try {
    const res = await fetch("https://www.rava.com/precios/panel.php?m=CED", {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es-AR,es;q=0.9",
        Referer: "https://www.rava.com/cotizaciones/cedears",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(`[cedears] Rava HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    const map  = {};

    const rowRegex  = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const cells = [];
      let cm;
      // Reset lastIndex para cada fila
      cellRegex.lastIndex = 0;
      const tempRegex = /<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi;
      while ((cm = tempRegex.exec(rowMatch[1])) !== null) {
        cells.push(cm[1].replace(/<[^>]+>/g, "").trim());
      }

      // Formato Rava: [0]=Especie [1]=Precio [2]=Var% [3]=Apertura ...
      if (cells.length >= 3) {
        const sym    = cells[0].toUpperCase().split(/\s/)[0].replace(/[^A-Z0-9.]/g, "");
        const precio = toNum(cells[1]);
        const varStr = cells[2]?.replace("%", "").replace("+", "").trim();
        const variacion = toNum(varStr);

        if (sym.length >= 1 && sym.length <= 8 && precio) {
          map[sym] = { precio, variacion: variacion ?? 0 };
        }
      }
    }

    const count = Object.keys(map).length;
    if (count === 0) {
      console.warn("[cedears] Rava: 0 símbolos parseados");
      return null;
    }

    console.log(`[cedears] Rava OK: ${count} símbolos`);
    return map;
  } catch (err) {
    console.warn("[cedears] Rava error:", err.message);
    return null;
  }
}

// ─── FUENTE 2: Finnhub × ratio × CCL (estimado) ──────────────────────────────
//
// precio_estimado_ARS = (precio_USD / ratio) × CCL_promedio
//
// Ej: MELI USD 14,75 × ratio 20 × CCL 1.450 = ARS 428.050
// Esto es una estimación — el precio real en BYMA puede diferir.
//
async function fetchEstimadoARS(cedear) {
  try {
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (!finnhubKey) return null;

    // 1. Precio en USD desde Finnhub
    const usdRes = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${cedear.usSymbol}&token=${finnhubKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!usdRes.ok) return null;
    const usdJson  = await usdRes.json();
    const precioUSD = parseFloat(usdJson?.c ?? 0);
    if (!precioUSD || precioUSD <= 0) return null;

    // 2. CCL desde /api/ccl
    const base   = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const cclRes = await fetch(`${base}/api/ccl`, { cache: "no-store" });
    if (!cclRes.ok) return null;
    const cclJson = await cclRes.json();
    const ccl     = parseFloat(cclJson?.promedio ?? 0);
    if (!ccl || ccl <= 0) return null;

    // 3. precio_ARS = precio_USD × ratio × CCL
    const precioARS = (precioUSD / cedear.ratio) * ccl;

    console.log(
      `[cedears] Estimado ${cedear.symbol}: USD ${precioUSD} / ratio ${cedear.ratio} × CCL ${ccl} = ARS ${precioARS.toFixed(2)}`
    );

    return {
      precio:    parseFloat(precioARS.toFixed(2)),
      variacion: null,  // no disponible desde esta fuente
    };
  } catch (err) {
    console.warn(`[cedears] Estimado ${cedear.symbol} error:`, err.message);
    return null;
  }
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
export async function GET() {
  try {
    if (cache.data && Date.now() - cache.timestamp < TTL) {
      return NextResponse.json(cache.data);
    }

    // Intento 1: Rava panel (todos los CEDEARs en 1 request)
    const panelMap = await fetchRavaPanel();

    // Construir resultados; fallback estimado para los que falten
    const results = await Promise.all(
      CEDEARS.map(async (cedear) => {
        const ravaData = panelMap?.[cedear.symbol] ?? null;

        if (ravaData) {
          // Precio real de BYMA
          return {
            symbol:          cedear.symbol,
            usSymbol:        cedear.usSymbol,
            name:            cedear.name,
            ratio:           cedear.ratio,
            precioCedear:    ravaData.precio,
            variacionCedear: ravaData.variacion,
            estimado:        false,
            error:           false,
          };
        }

        // Fallback: estimado vía Finnhub × ratio × CCL
        const estimadoData = await fetchEstimadoARS(cedear);

        return {
          symbol:          cedear.symbol,
          usSymbol:        cedear.usSymbol,
          name:            cedear.name,
          ratio:           cedear.ratio,
          precioCedear:    estimadoData?.precio    ?? null,
          variacionCedear: estimadoData?.variacion ?? null,
          estimado:        estimadoData !== null,
          error:           estimadoData === null,
        };
      })
    );

    const withData  = results.filter((r) => !r.error).length;
    const estimados = results.filter((r) => r.estimado).length;
    const reales    = withData - estimados;

    console.log(`[cedears] ${reales} reales, ${estimados} estimados, ${results.length - withData} sin datos`);

    const response = {
      data:      results,
      source:    panelMap ? "Rava BYMA" : "Sin datos de Rava — usando estimados",
      delay:     "~20 minutos (datos reales) / tiempo real estimado",
      withData,
      estimados,
      updatedAt: new Date().toISOString(),
    };

    cache = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[cedears] Error general:", err);
    return NextResponse.json(
      { error: "Error al obtener CEDEARs", detail: err.message, data: [] },
      { status: 500 }
    );
  }
}
