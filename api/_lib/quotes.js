async function fetchFromBrapi(ticker, token) {
  const params = new URLSearchParams({ range: "3mo", interval: "1d" });
  if (token) params.set("token", token);
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`brapi falhou (${res.status})`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("ticker não encontrado na brapi");
  const r = data.results[0];
  const closes = (r.historicalDataPrice || []).map((d) => d.close).filter((v) => typeof v === "number");
  return { price: r.regularMarketPrice, closes, source: "brapi" };
}

async function fetchFromBolsai(ticker, apiKey) {
  if (!apiKey) throw new Error("sem chave da bolsai");
  const headers = { "X-API-Key": apiKey };
  const res = await fetch(`https://api.usebolsai.com/api/v1/stocks/${encodeURIComponent(ticker)}/quote`, {
    headers,
  });
  if (!res.ok) throw new Error(`bolsai falhou (${res.status})`);
  const quote = await res.json();
  return { price: quote.close, closes: [], source: "bolsai" };
}

export async function fetchQuote(ticker, brapiToken, bolsaiKey) {
  try {
    return await fetchFromBrapi(ticker, brapiToken);
  } catch (err) {
    if (!bolsaiKey) throw err;
    return fetchFromBolsai(ticker, bolsaiKey);
  }
}
