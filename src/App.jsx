import React, { useState, useEffect, useCallback, useMemo } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Plus, X, TrendingUp, TrendingDown, Minus, RefreshCw, Settings2, AlertTriangle } from "lucide-react";

// ---------- design tokens ----------
const TOKENS = {
  bg: "#0A1628",
  bgAlt: "#0D1D33",
  panel: "#101F38",
  panelBorder: "#1D3252",
  gold: "#D4A62B",
  goldDim: "#8A7433",
  cream: "#EDE7D6",
  creamDim: "#9AA4B6",
  up: "#3FB878",
  upBg: "rgba(63,184,120,0.12)",
  down: "#E2543E",
  downBg: "rgba(226,84,62,0.12)",
  neutral: "#C9A438",
  neutralBg: "rgba(201,164,56,0.12)",
};

const FREE_TICKERS = ["PETR4", "VALE3", "ITUB4", "MGLU3"];
const DEFAULT_TICKERS = ["PETR4", "VALE3", "ITUB4"];

// ---------- indicator math ----------
function calcSMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes, period = 14) {
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

function getSignal(sma9, sma21, rsi) {
  if (sma9 == null || sma21 == null || rsi == null) {
    return { label: "Dados insuficientes", tone: "neutral" };
  }
  if (sma9 > sma21 && rsi < 70) return { label: "Tendência de alta", tone: "buy" };
  if (sma9 < sma21 && rsi > 30) return { label: "Tendência de baixa", tone: "sell" };
  return { label: "Lateral / neutro", tone: "neutral" };
}

function fmtBRL(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------- persistence (localStorage, funciona em qualquer navegador) ----------
function loadWatchlist() {
  try {
    const raw = localStorage.getItem("b3-watchlist");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* nada salvo ainda */
  }
  return null;
}
function saveWatchlist(list) {
  try {
    localStorage.setItem("b3-watchlist", JSON.stringify(list));
  } catch (e) {
    console.error("Falha ao salvar lista", e);
  }
}
function loadToken() {
  try {
    return localStorage.getItem("b3-token") || "";
  } catch (e) {
    return "";
  }
}
function saveToken(token) {
  try {
    if (token) localStorage.setItem("b3-token", token);
    else localStorage.removeItem("b3-token");
  } catch (e) {
    console.error("Falha ao salvar token", e);
  }
}

// ---------- API ----------
async function fetchTicker(ticker, token) {
  const params = new URLSearchParams({ range: "3mo", interval: "1d" });
  if (token) params.set("token", token);
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error("Token inválido ou ausente para este papel");
    throw new Error(`Falha na consulta (${res.status})`);
  }
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("Ticker não encontrado");
  }
  const r = data.results[0];
  const closes = (r.historicalDataPrice || [])
    .map((d) => d.close)
    .filter((v) => typeof v === "number");
  return {
    symbol: r.symbol,
    name: r.shortName || r.longName || r.symbol,
    price: r.regularMarketPrice,
    changePercent: r.regularMarketChangePercent,
    currency: r.currency || "BRL",
    closes,
  };
}

// ---------- signal pill ----------
function SignalPill({ tone, label }) {
  const map = {
    buy: { bg: TOKENS.upBg, fg: TOKENS.up, Icon: TrendingUp },
    sell: { bg: TOKENS.downBg, fg: TOKENS.down, Icon: TrendingDown },
    neutral: { bg: TOKENS.neutralBg, fg: TOKENS.neutral, Icon: Minus },
  };
  const s = map[tone] || map.neutral;
  const { Icon } = s;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
      style={{ background: s.bg, color: s.fg }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label.toUpperCase()}
    </span>
  );
}

// ---------- ticker card ----------
function TickerCard({ ticker, token, onRemove }) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  const load = useCallback(() => {
    setState({ status: "loading", data: null, error: null });
    fetchTicker(ticker, token)
      .then((data) => setState({ status: "ready", data, error: null }))
      .catch((err) => setState({ status: "error", data: null, error: err.message }));
  }, [ticker, token]);

  useEffect(() => {
    load();
  }, [load]);

  const indicators = useMemo(() => {
    if (!state.data) return null;
    const sma9 = calcSMA(state.data.closes, 9);
    const sma21 = calcSMA(state.data.closes, 21);
    const rsi = calcRSI(state.data.closes, 14);
    return { sma9, sma21, rsi, signal: getSignal(sma9, sma21, rsi) };
  }, [state.data]);

  const chartData = useMemo(() => {
    if (!state.data) return [];
    return state.data.closes.map((c, i) => ({ i, c }));
  }, [state.data]);

  const isUp = state.data && state.data.changePercent >= 0;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.panelBorder}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-lg font-bold tracking-wide"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: TOKENS.cream }}
          >
            {ticker}
          </div>
          <div className="text-xs mt-0.5" style={{ color: TOKENS.creamDim }}>
            {state.data ? state.data.name : "Carregando..."}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={load}
            aria-label="Atualizar"
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: TOKENS.creamDim }}
          >
            <RefreshCw size={14} className={state.status === "loading" ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => onRemove(ticker)}
            aria-label="Remover"
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: TOKENS.creamDim }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {state.status === "loading" && (
        <div className="py-6 text-sm text-center" style={{ color: TOKENS.creamDim }}>
          Buscando cotação...
        </div>
      )}

      {state.status === "error" && (
        <div
          className="rounded-lg p-3 text-xs flex items-start gap-2"
          style={{ background: TOKENS.downBg, color: TOKENS.down }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      {state.status === "ready" && state.data && (
        <>
          <div className="flex items-end justify-between">
            <div
              className="text-2xl font-bold"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: TOKENS.cream }}
            >
              {fmtBRL(state.data.price)}
            </div>
            <div
              className="text-sm font-semibold"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: isUp ? TOKENS.up : TOKENS.down }}
            >
              {isUp ? "▲" : "▼"} {Math.abs(state.data.changePercent || 0).toFixed(2)}%
            </div>
          </div>

          {chartData.length > 1 && (
            <div style={{ height: 56 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line
                    type="monotone"
                    dataKey="c"
                    stroke={isUp ? TOKENS.up : TOKENS.down}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {indicators && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: TOKENS.creamDim }}>
                  MM9
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: TOKENS.cream }}>
                  {indicators.sma9 ? indicators.sma9.toFixed(2) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: TOKENS.creamDim }}>
                  MM21
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: TOKENS.cream }}>
                  {indicators.sma21 ? indicators.sma21.toFixed(2) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: TOKENS.creamDim }}>
                  RSI 14
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: TOKENS.cream }}>
                  {indicators.rsi ? indicators.rsi.toFixed(0) : "—"}
                </div>
              </div>
            </div>
          )}

          {indicators && (
            <div className="flex justify-center pt-1">
              <SignalPill tone={indicators.signal.tone} label={indicators.signal.label} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- ticker tape ----------
function TickerTape({ tickers }) {
  const items = tickers.length ? tickers : ["ADICIONE", "UM", "PAPEL"];
  const strip = [...items, ...items, ...items];
  return (
    <div
      className="overflow-hidden whitespace-nowrap py-2 border-y"
      style={{ borderColor: TOKENS.panelBorder, background: TOKENS.bgAlt }}
    >
      <div className="tape-track inline-block">
        {strip.map((t, idx) => (
          <span
            key={idx}
            className="inline-block px-6 text-xs tracking-[0.2em] font-mono"
            style={{ color: TOKENS.goldDim }}
          >
            {t} <span style={{ color: TOKENS.panelBorder }}>•</span>
          </span>
        ))}
      </div>
      <style>{`
        .tape-track { animation: tape-scroll 40s linear infinite; }
        @keyframes tape-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.3333%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tape-track { animation: none; }
        }
      `}</style>
    </div>
  );
}

// ---------- main app ----------
export default function App() {
  const [tickers, setTickers] = useState(() => loadWatchlist() || DEFAULT_TICKERS);
  const [input, setInput] = useState("");
  const [token, setToken] = useState(() => loadToken());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    saveWatchlist(tickers);
  }, [tickers]);

  const addTicker = () => {
    const clean = input.trim().toUpperCase();
    if (!clean) return;
    if (tickers.includes(clean)) {
      setInput("");
      return;
    }
    setTickers((prev) => [...prev, clean]);
    setInput("");
  };

  const removeTicker = (t) => {
    setTickers((prev) => prev.filter((x) => x !== t));
  };

  const handleTokenChange = (val) => {
    setToken(val);
    saveToken(val);
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: TOKENS.bg, fontFamily: "'Public Sans', system-ui, sans-serif" }}
    >
      <TickerTape tickers={tickers} />

      <div className="max-w-3xl mx-auto px-5 py-6">
        <header className="mb-6">
          <div
            className="text-[11px] uppercase tracking-[0.3em] mb-1"
            style={{ color: TOKENS.gold }}
          >
            Bolsa de Valores · B3
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Source Serif 4', serif", color: TOKENS.cream }}
          >
            Painel de Análise
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.creamDim }}>
            Médias móveis e RSI calculados a partir do histórico de cada papel.
          </p>
        </header>

        <div className="flex gap-2 mb-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTicker()}
            placeholder="Adicionar ticker, ex: BBAS3"
            className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              background: TOKENS.panel,
              border: `1px solid ${TOKENS.panelBorder}`,
              color: TOKENS.cream,
            }}
          />
          <button
            onClick={addTicker}
            className="rounded-lg px-4 flex items-center justify-center font-semibold text-sm"
            style={{ background: TOKENS.gold, color: TOKENS.bg }}
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="rounded-lg px-3 flex items-center justify-center"
            style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.panelBorder}`, color: TOKENS.creamDim }}
            aria-label="Configurações"
          >
            <Settings2 size={16} />
          </button>
        </div>

        {showSettings && (
          <div
            className="rounded-lg p-4 mb-5 text-xs"
            style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.panelBorder}`, color: TOKENS.creamDim }}
          >
            <p className="mb-2">
              Sem token, apenas <span style={{ color: TOKENS.gold }}>{FREE_TICKERS.join(", ")}</span> funcionam
              (papéis de teste da brapi.dev). Para acompanhar qualquer outro papel da B3, cole abaixo um token
              gratuito gerado em <span style={{ color: TOKENS.gold }}>brapi.dev</span>.
            </p>
            <input
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="Token da brapi.dev (opcional)"
              className="w-full rounded-md px-3 py-2 text-xs outline-none font-mono"
              style={{ background: TOKENS.bg, border: `1px solid ${TOKENS.panelBorder}`, color: TOKENS.cream }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tickers.map((t) => (
            <TickerCard key={t} ticker={t} token={token} onRemove={removeTicker} />
          ))}
        </div>

        {tickers.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: TOKENS.creamDim }}>
            Nenhum papel na carteira. Adicione um ticker acima para começar.
          </div>
        )}

        <footer
          className="mt-8 pt-5 text-xs leading-relaxed"
          style={{ borderTop: `1px solid ${TOKENS.panelBorder}`, color: TOKENS.creamDim }}
        >
          Os sinais mostrados são apenas leituras técnicas automáticas (cruzamento de médias móveis e RSI) e não
          constituem recomendação de compra ou venda. Cotações fornecidas por brapi.dev, sujeitas a atraso. Decisões
          de investimento são de sua responsabilidade — considere consultar um profissional certificado.
        </footer>
      </div>
    </div>
  );
}
