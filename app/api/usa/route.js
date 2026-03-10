/**
 * app/api/usa/route.js
 *
 * Obtiene precios de acciones en USA con dos estrategias:
 *
 * 1. FINNHUB (principal, recomendado) — API key GRATUITA de 5 minutos.
 *    → https://finnhub.io → "Get free API key" → sin tarjeta de crédito
 *    → Agregar en .env.local: FINNHUB_API_KEY=tu_key_aqui
 *    → 60 requests/minuto en plan gratuito, más que suficiente.
 *
 * 2. Yahoo Finance (fallback) — sin API key, pero requiere cookie+crumb dinámico.
 *    Yahoo cambió su seguridad en 2023 y ahora exige sesión autenticada.
 *    Este módulo la obtiene automáticamente, pero puede fallar ocasionalmente.
 *
 * SIN NINGUNA DE LAS DOS: se muestra "—" para precios USA (normal si el
 * mercado está cerrado o si aún no configuraste Finnhub).
 */

import { NextResponse } from "next/server";
import { CEDEARS } from "@/data/cedears";

// ─── Caché ───────────────────────────────────────────────────────────────────
let cache       = { data: null, timestamp: 0 };
let yahooSess   = { cookie: null, crumb: null, ts: 0 };
const DATA_TTL  = 55 * 1000;    // 55 s
const SESS_TTL  = 7 * 60 * 1000; // 7 min (Yahoo expira cookies rápido)

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// ═══════════════════════════════════════════════════════════════════════════════
// FUENTE 1 — FINNHUB (usa API key gratuita)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene cotizaciones en bloque para reducir requests.
 * Finnhub no tiene endpoint batch, así que hacemos todas en paralelo.
 * Con 18 CEDEARs y 60 req/min free tier, entra perfecto.
 */
async function fetchAllFinnhub(symbols) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return {};

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Finnhub ${res.status} para ${symbol}`);
      const j = await res.json();

      const price = parseFloat(j?.c ?? 0);   // current price
      const prev  = parseFloat(j?.pc ?? 0);  // previous close
      if (!price || price === 0) throw new Error(`Sin precio para ${symbol}`);

      const change = prev !== 0 ? ((price - prev) / prev) * 100 : 0;
      return {
        symbol,
        price,
        change: parseFloat(change.toFixed(2)),
      };
    })
  );

  const map = {};
  let ok = 0, fail = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      map[r.value.symbol] = { price: r.value.price, change: r.value.change };
      ok++;
    } else {
      fail++;
      console.warn("[usa/finnhub]", r.reason?.message ?? r.reason);
    }
  }
  console.log(`[usa] Finnhub: ${ok} OK, ${fail} fallos`);
  return map;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUENTE 2 — YAHOO FINANCE (cookie + crumb dinámico)
// ═══════════════════════════════════════════════════════════════════════════════

async function getYahooSession() {
  if (yahooSess.cookie && yahooSess.crumb && Date.now() - yahooSess.ts < SESS_TTL) {
    return yahooSess;
  }

  try {
    // Paso 1: conseguir cookie visitando Yahoo Finance
    const homeRes = await fetch("https://finance.yahoo.com/", {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    // Extraer todas las cookies del Set-Cookie header
    const setCookie = homeRes.headers.get("set-cookie") ?? "";
    // Buscar cookies relevantes para Yahoo Finance
    const cookieParts = [];
    const patterns = [/A1=[^;,\s]+/, /A3=[^;,\s]+/, /A1S=[^;,\s]+/, /cmp=[^;,\s]+/];
    for (const p of patterns) {
      const m = setCookie.match(p);
      if (m) cookieParts.push(m[0]);
    }
    // Fallback: cookie mínima que acepta Yahoo
    const cookie =
      cookieParts.length > 0
        ? cookieParts.join("; ")
        : "A1=d=AQABBAxxxxxxx&S=AQAAAx; A1S=d=AQABBAxxxxxxx&S=AQAAAx";

    // Paso 2: obtener crumb
    const crumbRes = await fetch(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: {
          "User-Agent": UA,
          Accept: "text/plain, */*",
          Cookie: cookie,
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!crumbRes.ok) {
      throw new Error(`getcrumb devolvió ${crumbRes.status}`);
    }

    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.length < 3 || crumb.includes("<")) {
      throw new Error(`Crumb inválido: "${crumb.slice(0, 30)}"`);
    }

    yahooSess = { cookie, crumb, ts: Date.now() };
    console.log("[usa] Yahoo sesión renovada, crumb:", crumb.slice(0, 5) + "***");
    return yahooSess;
  } catch (err) {
    console.warn("[usa] Yahoo sesión falló:", err.message);
    yahooSess.ts = 0; // forzar reintento la próxima vez
    return null;
  }
}

async function fetchYahooQuotes(symbols) {
  const session = await getYahooSession();
  if (!session) return {};

  try {
    const joined = encodeURIComponent(symbols.join(","));
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${joined}&crumb=${encodeURIComponent(session.crumb)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: session.cookie,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      yahooSess.ts = 0; // forzar renovación de sesión
      throw new Error(`Yahoo devolvió ${res.status} — sesión expirada`);
    }
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

    const json = await res.json();
    const quotes = json?.quoteResponse?.result ?? [];

    if (!quotes.length) {
      const error = json?.quoteResponse?.error;
      throw new Error(`Sin quotes de Yahoo. Error: ${JSON.stringify(error)}`);
    }

    const map = {};
    for (const q of quotes) {
      if (!q?.regularMarketPrice) continue;
      map[q.symbol] = {
        price:  parseFloat(q.regularMarketPrice),
        change: parseFloat(q.regularMarketChangePercent ?? 0),
      };
    }
    console.log(`[usa] Yahoo: ${Object.keys(map).length} símbolos OK`);
    return map;
  } catch (err) {
    console.warn("[usa] Yahoo quotes falló:", err.message);
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    if (cache.data && Date.now() - cache.timestamp < DATA_TTL) {
      return NextResponse.json(cache.data);
    }

    const symbols = [...new Set(CEDEARS.map((c) => c.usSymbol))];
    const hasFinnhub = !!process.env.FINNHUB_API_KEY;

    let quotesMap = {};
    let sourceUsed = "";

    if (hasFinnhub) {
      // CAMINO PRINCIPAL: Finnhub (confiable, siempre funciona con API key)
      quotesMap = await fetchAllFinnhub(symbols);
      sourceUsed = "Finnhub";

      // Para los que Finnhub no devolvió, intentar Yahoo
      const missing = symbols.filter((s) => !quotesMap[s]);
      if (missing.length > 0) {
        const yahooMap = await fetchYahooQuotes(missing);
        Object.assign(quotesMap, yahooMap);
        if (Object.keys(yahooMap).length > 0) sourceUsed += " + Yahoo Finance";
      }
    } else {
      // SIN FINNHUB: solo Yahoo Finance (puede fallar)
      console.warn("[usa] ⚠️  Sin FINNHUB_API_KEY — usando Yahoo Finance solo. Puede fallar.");
      quotesMap = await fetchYahooQuotes(symbols);
      sourceUsed = "Yahoo Finance";
    }

    const results = CEDEARS.map((cedear) => {
      const q = quotesMap[cedear.usSymbol];
      return {
        usSymbol:    cedear.usSymbol,
        symbol:      cedear.symbol,
        precioUSA:   q?.price  ?? null,
        variacionUSA: q?.change ?? null,
        error:       !q?.price,
      };
    });

    const withData = results.filter((r) => !r.error).length;

    if (withData === 0 && !hasFinnhub) {
      console.warn(
        "[usa] ⚠️  0 precios obtenidos. Agregá FINNHUB_API_KEY en .env.local para solucionar esto."
      );
    }

    const response = {
      data:      results,
      source:    sourceUsed || "Sin fuente disponible",
      delay:     "15 min diferido según bolsa",
      withData,
      hasFinnhub,
      tip:       hasFinnhub
        ? undefined
        : "Agregá FINNHUB_API_KEY en .env.local para datos USA confiables. Ver README.",
      updatedAt: new Date().toISOString(),
    };

    cache = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[usa] Error general:", err);
    return NextResponse.json(
      { error: "Error al obtener datos USA", detail: err.message, data: [] },
      { status: 500 }
    );
  }
}
