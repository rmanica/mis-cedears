/**
 * services/market.js
 *
 * Servicio de acceso a datos de mercado y utilidades de formato.
 */

const BASE_URL =
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function fetchMarketData() {
  const [cedearsRes, usaRes, cclRes] = await Promise.allSettled([
    fetch(`${BASE_URL}/api/cedears`, { cache: "no-store" }),
    fetch(`${BASE_URL}/api/usa`,     { cache: "no-store" }),
    fetch(`${BASE_URL}/api/ccl`,     { cache: "no-store" }),
  ]);

  const errors = [];

  let cedearsData = { data: [] };
  if (cedearsRes.status === "fulfilled" && cedearsRes.value.ok) {
    try { cedearsData = await cedearsRes.value.json(); }
    catch { errors.push("Error al parsear CEDEARs"); }
  } else {
    errors.push("No se pudieron obtener los CEDEARs");
  }

  let usaData = { data: [] };
  if (usaRes.status === "fulfilled" && usaRes.value.ok) {
    try { usaData = await usaRes.value.json(); }
    catch { errors.push("Error al parsear acciones USA"); }
  } else {
    errors.push("No se pudieron obtener las acciones USA");
  }

  let cclData = null;
  if (cclRes.status === "fulfilled" && cclRes.value.ok) {
    try { cclData = await cclRes.value.json(); }
    catch { errors.push("Error al parsear el CCL"); }
  } else {
    errors.push("No se pudo obtener el CCL");
  }

  // Merge CEDEARs + USA
  const usaMap = {};
  for (const item of usaData.data ?? []) {
    usaMap[item.usSymbol] = item;
  }

  const merged = (cedearsData.data ?? []).map((cedear) => {
    const usa = usaMap[cedear.usSymbol] ?? {};
    return {
      symbol:          cedear.symbol,
      usSymbol:        cedear.usSymbol,
      name:            cedear.name,
      ratio:           cedear.ratio,
      precioCedear:    cedear.precioCedear,
      variacionCedear: cedear.variacionCedear,
      estimado:        cedear.estimado ?? false,
      precioUSA:       usa.precioUSA   ?? null,
      variacionUSA:    usa.variacionUSA ?? null,
      // CCL implícito = (precioCedear × ratio) / precioUSA
      cclImplicito:
        cedear.precioCedear && usa.precioUSA && cedear.ratio && !cedear.estimado
          ? parseFloat(((cedear.precioCedear * cedear.ratio) / usa.precioUSA).toFixed(2))
          : null,
      error: cedear.error && !usa.precioUSA,
    };
  });

  return { cedears: merged, ccl: cclData, updatedAt: new Date().toISOString(), errors };
}

// ─── Formateo de números ──────────────────────────────────────────────────────

/**
 * Precio en pesos argentinos, sin símbolo $
 * Ej: 100912.5 → "ARS 100.912,50"
 */
export function formatARS(value) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  // Formatear con separadores argentinos, sin símbolo de moneda
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `$ ${formatted}`;
}

/**
 * Precio en dólares, sin símbolo $
 * Ej: 1755.5 → "USD 1.755,50"
 */
export function formatUSD(value) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `USD ${formatted}`;
}

/**
 * Variación porcentual
 * Ej: 2.35 → "+2,35%"
 */
export function formatPct(value) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}
