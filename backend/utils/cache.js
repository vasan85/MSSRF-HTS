/**
 * Lightweight in-process TTL cache.
 * No external dependencies — uses a plain Map with expiry timestamps.
 *
 * Usage:
 *   const cache = require('./utils/cache');
 *   const data  = await cache.getOrSet('key', ttlSeconds, async () => expensiveQuery());
 *   cache.invalidate('key');          // single key
 *   cache.invalidatePrefix('masters'); // all keys starting with "masters"
 */

const store = new Map(); // key → { value, expiresAt }

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { store.delete(key); return undefined; }
  return entry.value;
}

function set(key, value, ttlSeconds) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function getOrSet(key, ttlSeconds, fn) {
  const cached = get(key);
  if (cached !== undefined) return cached;
  const value = await fn();
  set(key, value, ttlSeconds);
  return value;
}

function invalidate(key) {
  store.delete(key);
}

function invalidatePrefix(prefix) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

function stats() {
  let active = 0;
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now <= v.expiresAt) active++;
    else store.delete(k);
  }
  return { total: store.size, active };
}

// Sweep expired entries every 5 minutes to prevent memory growth
setInterval(() => stats(), 5 * 60 * 1000).unref();

module.exports = { get, set, getOrSet, invalidate, invalidatePrefix, stats };
