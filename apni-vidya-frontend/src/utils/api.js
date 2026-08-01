/* ═══════════════════════════════════════════════
   API LAYER — Centralized HTTP with auth, toasts,
   file uploads, and auto-logout on 401
   ═══════════════════════════════════════════════ */

const REAL_API = import.meta.env.VITE_API_URL || '';
const uid = () => Math.random().toString(36).slice(2, 10);

/* ─── Global toast bus ─── */
const _toastListeners = new Set();
export function toast(message, type = 'error') {
  _toastListeners.forEach(fn => fn({ id: uid(), message, type }));
}
export function onToast(fn) {
  _toastListeners.add(fn);
  return () => _toastListeners.delete(fn);
}

/* ─── Global auth-expired handlers ─── */
const _logoutHandlers = new Set();
export function onAuthExpired(fn) {
  _logoutHandlers.add(fn);
  return () => _logoutHandlers.delete(fn);
}
function triggerAuthExpired() {
  _logoutHandlers.forEach(fn => fn());
}

/* ─── Core fetch wrapper ─── */
async function realApi(path, opts = {}) {
  const token = localStorage.getItem('av2_token');
  const headers = {
    ...(opts.isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };

  const fetchOpts = { ...opts, headers };
  if (opts.isFormData) {
    delete fetchOpts.isFormData;
  }

  const r = await fetch(`${REAL_API}${path}`, fetchOpts);

  if (r.status === 401) {
    triggerAuthExpired();
    throw new Error('Session expired. Please sign in again.');
  }

  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

async function api(method, path, body) {
  return realApi(path, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export const GET = (p) => api('GET', p);

async function _mutate(method, p, b, okMsg) {
  try {
    const r = await api(method, p, b);
    if (okMsg) toast(okMsg, 'success');
    return r;
  } catch (e) {
    toast(e.message || 'Something went wrong. Please try again.', 'error');
    throw e;
  }
}

export const POST = (p, b, okMsg) => _mutate('POST', p, b, okMsg);
export const PUT = (p, b, okMsg) => _mutate('PUT', p, b, okMsg);
export const PATCH = (p, b, okMsg) => _mutate('PATCH', p, b, okMsg);
export const DEL = (p, okMsg) => _mutate('DELETE', p, undefined, okMsg);

/* ─── File Upload (multipart/form-data) ─── */
export async function UPLOAD(path, formData, okMsg) {
  try {
    const r = await realApi(path, {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
    if (okMsg) toast(okMsg, 'success');
    return r;
  } catch (e) {
    toast(e.message || 'Upload failed.', 'error');
    throw e;
  }
}

/* ─── Razorpay Payment Flow ─── */
function loadRazorpay() {
  return new Promise((res, rej) => {
    if (window.Razorpay) return res();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => res();
    s.onerror = () => rej(new Error('Could not load payment gateway'));
    document.body.appendChild(s);
  });
}

export async function payNow(feeRecordId, onDone) {
  let order;
  try {
    order = await POST('/payments/order', { fee_record_id: feeRecordId });
  } catch {
    return;
  }

  try {
    await loadRazorpay();
  } catch (e) {
    toast(e.message);
    return;
  }

  const rzp = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: 'Apni Vidya',
    description: order.fee && order.fee.title,
    handler: async (resp) => {
      try {
        await POST('/payments/verify', {
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
        }, 'Payment successful');
        if (onDone) onDone();
      } catch { /* error already toasted */ }
    },
    theme: { color: '#4f46e5' },
  });
  rzp.open();
}
