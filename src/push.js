const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export function getOrCreateSubId() {
  let id = localStorage.getItem("b3-push-sub-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("b3-push-sub-id", id);
  }
  return id;
}

export async function subscribeToPush() {
  if (!isPushSupported()) throw new Error("este navegador não suporta notificações push");
  if (!VAPID_PUBLIC_KEY) throw new Error("chave pública VAPID não configurada (VITE_VAPID_PUBLIC_KEY)");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("permissão de notificação negada");

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  return subscription;
}

export async function sendSubscriptionToServer(subscription, tickers, brapiToken, bolsaiKey) {
  const subId = getOrCreateSubId();
  const res = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subId, subscription, tickers, brapiToken, bolsaiKey }),
  });
  if (!res.ok) throw new Error("falha ao salvar a inscrição no servidor");
  return res.json();
}

export async function removeSubscriptionFromServer() {
  const subId = getOrCreateSubId();
  await fetch("/api/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subId }),
  });
}
