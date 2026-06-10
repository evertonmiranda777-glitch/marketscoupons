// Token bucket rate limiter, in-memory por instância serverless.
// Cold starts limpam o state, então é defesa best-effort contra abuse, não anti-DDoS de produção.
// Pra controle real seria preciso Upstash Redis ou Vercel KV.

const buckets = new Map();
const WINDOW_MS = 60_000; // janela de 1 minuto

function getKey(prefix, id) { return prefix + ':' + id; }

function take(prefix, id, limit) {
  const k = getKey(prefix, id);
  const now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.start > WINDOW_MS) {
    b = { count: 0, start: now };
  }
  b.count++;
  buckets.set(k, b);

  // Cleanup buckets antigos quando crescer demais (evita leak em instâncias warm)
  if (buckets.size > 5000) {
    const cutoff = now - WINDOW_MS;
    for (const [key, bucket] of buckets) {
      if (bucket.start < cutoff) buckets.delete(key);
    }
  }
  return b.count <= limit;
}

function getIp(req) {
  const xff = req.headers['x-forwarded-for'] || '';
  return xff.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

// Limit padrão: 60 req/min por IP
function rateLimitIp(req, limit = 60) {
  return take('ip', getIp(req), limit);
}

// Limit padrão: 600 req/min por user autenticado
function rateLimitUser(userId, limit = 600) {
  if (!userId) return true; // sem user, deixa o IP limit cobrir
  return take('user', userId, limit);
}

module.exports = { rateLimitIp, rateLimitUser, getIp };
