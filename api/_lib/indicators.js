export function calcSMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;
  let gains = 0,
    losses = 0;
  const start = closes.length - period;
  for (let i = start; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function getSignal(sma9, sma21, rsi) {
  if (sma9 == null || sma21 == null || rsi == null) {
    return { label: "Dados insuficientes", tone: "neutral" };
  }
  if (sma9 > sma21 && rsi < 70) return { label: "Tendência de alta", tone: "buy" };
  if (sma9 < sma21 && rsi > 30) return { label: "Tendência de baixa", tone: "sell" };
  return { label: "Lateral / neutro", tone: "neutral" };
}
