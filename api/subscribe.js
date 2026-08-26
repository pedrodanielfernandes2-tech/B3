import { upsertSubscription, deleteSubscription } from "./_lib/db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "POST") {
      const { subId, subscription, tickers, brapiToken, bolsaiKey } = req.body || {};
      if (!subId || !subscription) {
        return res.status(400).json({ error: "subId e subscription são obrigatórios" });
      }
      await upsertSubscription(subId, { subscription, tickers: tickers || {}, brapiToken, bolsaiKey });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { subId } = req.body || {};
      if (!subId) return res.status(400).json({ error: "subId é obrigatório" });
      await deleteSubscription(subId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não suportado" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
