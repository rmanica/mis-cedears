# 📈 CEDEARs Dashboard

Panel de seguimiento de precios de **CEDEARs** y sus **acciones espejo en USA**, con cotización del **Dólar CCL** en tiempo real.

Diseñado para ser claro y accesible, con fuentes grandes y alto contraste.

---

## 🚀 Instalación rápida

```bash
# 1. Instalá las dependencias
npm install

# 2. Configurá variables de entorno
cp .env.local.example .env.local
# → (Recomendado) Editá .env.local y agregá tu FINNHUB_API_KEY

# 3. Corré el servidor de desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🔑 Clave de Finnhub (muy recomendado para datos USA)

Yahoo Finance cambió su sistema de seguridad y ahora requiere cookie + crumb dinámico, lo que puede fallar. **Finnhub** es una alternativa gratuita y confiable.

**Cómo obtener la API key de Finnhub (5 minutos, sin tarjeta):**

1. Ir a [https://finnhub.io](https://finnhub.io)
2. Click en **"Get free API key"** (arriba a la derecha)
3. Registrarse con tu email
4. Copiar la key del dashboard
5. Editá `.env.local`:
   ```
   FINNHUB_API_KEY=tu_key_aqui
   ```
6. Reiniciá el servidor: `npm run dev`

El plan gratuito incluye 60 requests/minuto — perfecto para este dashboard.

---

## 📦 Deploy en Vercel

```bash
# Con Vercel CLI:
npx vercel --prod
```

En el panel de Vercel, agregá la variable de entorno `FINNHUB_API_KEY` en Settings → Environment Variables.

---

## ➕ Agregar o quitar CEDEARs

Editá el archivo **`data/cedears.js`**:

```js
{ symbol: "AAPL", usSymbol: "AAPL", name: "Apple Inc.", ratio: 10 },
```

| Campo | Descripción |
|-------|-------------|
| `symbol` | Ticker del CEDEAR en BYMA (mercado argentino) |
| `usSymbol` | Ticker en USA para Yahoo Finance / Finnhub |
| `name` | Nombre de la empresa |
| `ratio` | Cuántos CEDEARs equivalen a 1 acción USA |

---

## 🔌 Fuentes de datos

| Dato | Fuente primaria | Fallback | API Key |
|------|----------------|---------|---------|
| Precios CEDEAR | IOL InvertirOnline | Rava Bursátil / BYMA | ❌ No |
| Precios USA | Yahoo Finance (cookie+crumb) | Finnhub | ✅ Opcional (recomendado) |
| Dólar CCL | DolarAPI | ArgentinaDatos / Ámbito | ❌ No |

---

## ⚠️ Advertencia

Los valores de CEDEARs provienen de BYMA (~20 min de retraso).  
Las acciones USA tienen demora de ~15 min según la bolsa.  
**Esta información es referencial y no constituye asesoramiento financiero.**

---

## 🛠️ Stack

- **Next.js 13+** con App Router
- **React 18**
- **Tailwind CSS 3**
- **Lucide React** (íconos)
- APIs: IOL, Rava/BYMA, Yahoo Finance, Finnhub (opt.), DolarAPI
