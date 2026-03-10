/**
 * data/cedears.js
 *
 * Ratios oficiales BYMA (fuente: BYMA-CEDEARs-2025-11-07.pdf).
 * El ratio X:1 significa que X CEDEARs = 1 acción en USA.
 * Es decir, 1 CEDEAR representa 1/X de una acción.
 *
 * Fórmula para precio estimado cuando Rava no está disponible:
 *   precio_estimado_ARS = (precio_USD / ratio) × CCL
 *
 * Fórmula para CCL implícito (verificación interna):
 *   CCL_implícito = (precioCedear × ratio) / precio_USD
 */

const CEDEARS = [
  {
    symbol:   "KO",
    usSymbol: "KO",
    name:     "The Coca-Cola Company",
    ratio:    5,     // 5 CEDEARs = 1 acción NYSE  (BYMA 2025)
  },
  {
    symbol:   "COST",
    usSymbol: "COST",
    name:     "Costco Wholesale Corp.",
    ratio:    48,    // 48 CEDEARs = 1 acción NASDAQ (BYMA nov-2025)
  },
  {
    symbol:   "MELI",
    usSymbol: "MELI",
    name:     "MercadoLibre Inc.",
    ratio:    120,   // 120 CEDEARs = 1 acción NASDAQ (BYMA ene-2025)
  },
  {
    symbol:   "EWZ",
    usSymbol: "EWZ",
    name:     "iShares MSCI Brazil ETF",
    ratio:    2,     // 2 CEDEARs = 1 cuota ETF NYSE Arca (BYMA 2024)
  },

  // ── Para agregar un CEDEAR: descomentar y ajustar ratio desde BYMA ────────
  // { symbol: "AAPL",  usSymbol: "AAPL",  name: "Apple Inc.",         ratio: 20  },
  // { symbol: "MSFT",  usSymbol: "MSFT",  name: "Microsoft Corp.",     ratio: 10  },
  // { symbol: "GOOGL", usSymbol: "GOOGL", name: "Alphabet Inc.",       ratio: 83  },
  // { symbol: "AMZN",  usSymbol: "AMZN",  name: "Amazon.com Inc.",     ratio: 84  },
  // { symbol: "TSLA",  usSymbol: "TSLA",  name: "Tesla Inc.",          ratio: 15  },
  // { symbol: "META",  usSymbol: "META",  name: "Meta Platforms Inc.", ratio: 24  },
  // { symbol: "NVDA",  usSymbol: "NVDA",  name: "NVIDIA Corp.",        ratio: 100 },
  // { symbol: "NFLX",  usSymbol: "NFLX",  name: "Netflix Inc.",        ratio: 16  },
  // { symbol: "JPM",   usSymbol: "JPM",   name: "JPMorgan Chase",      ratio: 5   },
];

module.exports = { CEDEARS };
