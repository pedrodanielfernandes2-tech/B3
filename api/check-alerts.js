import webpush from "web-push";
import { listSubIds, getSubscription, getAlertState, setAlertState, deleteSubscription } from "./_lib/db.js";
import { calcSMA, calcRSI, getSignal } from "./_lib/indicators.js";
import { fetchQuote } from "./_lib/quotes.js";

function fmtBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function handler(req, res) {
  // Protege o endpoint: só executa se o segredo bater, senão qualquer um na
  // internet poderia chamar essa URL e gastar sua cota das APIs de cotação.
  const secret = req.query.secret;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "não autorizado" });
  }

  webpush.setVapidDetails(
    "mailto:alertas@painel-b3.local",
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const subIds = await listSubIds();
  const quoteCache = new Map(); // evita buscar o mesmo ticker duas vezes na mesma execução
  let checked = 0;
  let sent = 0;
  let removed = 0;

  for (const subId of subIds) {
    const record = await getSubscription(subId);
    if (!record) continue;

    const tickers = Object.keys(record.tickers || {});
    for (const ticker of tickers) {
      const cfg = record.tickers[ticker];
      if (!cfg) continue;
      checked++;

      let quote;
      try {
        if (!quoteCache.has(ticker)) {
          quoteCache.set(ticker, await fetchQuote(ticker, record.brapi_token, record.bolsai_key));
        }
        quote = quoteCache.get(ticker);
      } catch (err) {
        continue; // ticker indisponível nessa rodada, tenta de novo na próxima
      }

      const sma9 = calcSMA(quote.closes, 9);
      const sma21 = calcSMA(quote.closes, 21);
      const rsi = calcRSI(quote.closes, 14);
      const signal = getSignal(sma9, sma21, rsi);

      const prevState = (await getAlertState(subId, ticker)) || { tone: null, above_fired: false, below_fired: false };
      const newState = {
        tone: prevState.tone,
        aboveFired: prevState.above_fired,
        belowFired: prevState.below_fired,
      };
      let message = null;

      if (cfg.onBuy && signal.tone === "buy" && prevState.tone !== "buy") {
        message = `${ticker}: sinal virou tendência de alta (${fmtBRL(quote.price)})`;
      } else if (cfg.onSell && signal.tone === "sell" && prevState.tone !== "sell") {
        message = `${ticker}: sinal virou tendência de baixa (${fmtBRL(quote.price)})`;
      }
      newState.tone = signal.tone;

      if (cfg.priceAbove && quote.price >= Number(cfg.priceAbove)) {
        if (!prevState.above_fired) {
          message = `${ticker} atingiu ${fmtBRL(quote.price)} (meta: acima de ${fmtBRL(Number(cfg.priceAbove))})`;
          newState.aboveFired = true;
        }
      } else {
        newState.aboveFired = false;
      }

      if (cfg.priceBelow && quote.price <= Number(cfg.priceBelow)) {
        if (!prevState.below_fired) {
          message = `${ticker} caiu para ${fmtBRL(quote.price)} (meta: abaixo de ${fmtBRL(Number(cfg.priceBelow))})`;
          newState.belowFired = true;
        }
      } else {
        newState.belowFired = false;
      }

      await setAlertState(subId, ticker, newState);

      if (message) {
        try {
          await webpush.sendNotification(
            record.subscription,
            JSON.stringify({ title: "Painel B3", body: message })
          );
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            // inscrição expirou ou foi revogada pelo navegador — limpa do banco
            await deleteSubscription(subId);
            removed++;
          }
        }
      }
    }
  }

  return res.status(200).json({ ok: true, subscriptions: subIds.length, checked, sent, removed });
}
