// Fala direto com a API REST do Supabase (PostgREST) via fetch — sem precisar
// da biblioteca @supabase/supabase-js. Usa a chave "service_role", que só
// existe aqui no backend e nunca é enviada ao navegador.

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function rest(path, options = {}) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Supabase não configurado (faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase falhou (${res.status}): ${text}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ---------- inscrições ----------
export async function getSubscription(subId) {
  const rows = await rest(`b3_subscriptions?sub_id=eq.${encodeURIComponent(subId)}&select=*`);
  return rows && rows[0] ? rows[0] : null;
}

export async function upsertSubscription(subId, { subscription, tickers, brapiToken, bolsaiKey }) {
  await rest(`b3_subscriptions`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([
      {
        sub_id: subId,
        subscription,
        tickers,
        brapi_token: brapiToken || null,
        bolsai_key: bolsaiKey || null,
        updated_at: new Date().toISOString(),
      },
    ]),
  });
}

export async function deleteSubscription(subId) {
  await rest(`b3_subscriptions?sub_id=eq.${encodeURIComponent(subId)}`, { method: "DELETE" });
  // b3_alert_state é limpo automaticamente pelo "on delete cascade" do schema
}

export async function listSubIds() {
  const rows = await rest(`b3_subscriptions?select=sub_id`);
  return (rows || []).map((r) => r.sub_id);
}

// ---------- estado dos alertas (evita notificar repetido) ----------
export async function getAlertState(subId, ticker) {
  const rows = await rest(
    `b3_alert_state?sub_id=eq.${encodeURIComponent(subId)}&ticker=eq.${encodeURIComponent(ticker)}&select=*`
  );
  return rows && rows[0] ? rows[0] : null;
}

export async function setAlertState(subId, ticker, state) {
  await rest(`b3_alert_state?on_conflict=sub_id,ticker`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([
      {
        sub_id: subId,
        ticker,
        tone: state.tone,
        above_fired: state.aboveFired,
        below_fired: state.belowFired,
        updated_at: new Date().toISOString(),
      },
    ]),
  });
}
