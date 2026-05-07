/**
 * tracking.js — sub_id (keyword) injection for affiliate links
 *
 * Captures UTMs from URL on pageload (TTL 30d, last-touch).
 * On affiliate link click OR window.open(<affiliate>...), injects
 * ?keyword=<value> BEFORE the hash anchor, where <value> is built by cascade:
 *   1. utm_term     → fb_<term>
 *   2. utm_campaign → fb_<campaign>
 *   3. fbclid (no UTM) → fb
 *   4. utm_source   → <source>
 *   5. (none)       → mcsite
 *
 * SECURITY GUARANTEES:
 * - Failsafe: any error → original URL untouched (try/catch everywhere)
 * - Idempotent: re-running does not duplicate ?keyword=
 * - Feature flag TRACKING_ENABLED (set false → system off without redeploy)
 * - Whitelist of affiliate URL substrings (not domain-wide)
 *
 * Loaded last via <script src="/tracking.js" defer></script>
 */
(function () {
  'use strict';

  const TRACKING_ENABLED = true;
  if (!TRACKING_ENABLED) return;

  const AFFILIATE_MATCHES = [
    'apextraderfunding.com/member/aff/go/evertonmiranda',
    'bulenox.com/member/aff/go/marketcoupons'
  ];

  const STORAGE_KEY = 'mc_attribution';
  const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  const MAX_LEN = 100;

  // Dev detection: localhost, staging.*, *.vercel.app
  const IS_DEV = /^localhost$|^127\.|staging\.|\.vercel\.app$/i.test(location.hostname);

  function log(msg) {
    if (!IS_DEV) return;
    try { console.log('[mc-tracking]', msg); } catch (e) {}
  }

  function sanitize(s) {
    try {
      return String(s).toLowerCase().replace(/[^a-z0-9_\-]/g, '_').slice(0, MAX_LEN);
    } catch (e) { return ''; }
  }

  // Decode recursivo (Meta as vezes manda double-encoded)
  function safeDecodeUtm(s) {
    if (!s) return null;
    let cur = String(s), prev = '';
    for (let i = 0; i < 3 && cur !== prev; i++) {
      prev = cur;
      try { cur = decodeURIComponent(cur); } catch (e) { return prev; }
    }
    return cur;
  }

  // ─── Step 1: Persist UTMs from URL into localStorage (TTL 30d, last-touch) ───
  function persistUtmsFromUrl() {
    try {
      const p = new URLSearchParams(location.search);
      const _g = (k) => safeDecodeUtm(p.get(k));
      const fromUrl = {
        utm_source:   _g('utm_source'),
        utm_medium:   _g('utm_medium'),
        utm_campaign: _g('utm_campaign'),
        utm_content:  _g('utm_content'),
        utm_term:     _g('utm_term'),
        fbclid:       p.get('fbclid')       || null,
        gclid:        p.get('gclid')        || null,
        ttclid:       p.get('ttclid')       || null,
      };
      const hasAny = Object.values(fromUrl).some(Boolean);

      let existing = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) existing = JSON.parse(raw) || {};
      } catch (e) {}

      // Expire stale entry past TTL
      if (existing.ts && Date.now() - existing.ts > TTL_MS) existing = {};

      if (hasAny) {
        // Last-touch: overwrite only the keys present in current URL
        Object.entries(fromUrl).forEach(([k, v]) => { if (v) existing[k] = v; });
        existing.ts = Date.now();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(existing)); } catch (e) {}
      } else if (Object.keys(existing).length > 0 && !existing.ts) {
        // Backfill ts on entries written by app.js without timestamp
        existing.ts = Date.now();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(existing)); } catch (e) {}
      }
    } catch (e) {}
  }

  // ─── Step 2: Read attribution object from localStorage (respects TTL) ───
  function readAttribution() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const attr = JSON.parse(raw) || {};
      if (attr.ts && Date.now() - attr.ts > TTL_MS) return null;
      return attr;
    } catch (e) { return null; }
  }

  // ─── Step 3: Build keyword from attribution (cascade) ───
  // Rejeita macros Meta não substituídos (ex: __ad_name__, {{campaign.name}}, {ad_name}).
  // Sem isso, sub_id chegava no painel da firma como 'fb___ad_name__' — inútil pra atribuição.
  function isMetaMacroLiteral(v) {
    if (!v || typeof v !== 'string') return false;
    const s = v.trim();
    return /^__.+__$/.test(s)        // __ad_name__
        || /\{\{.+\}\}/.test(s)       // {{ad.name}}, {{campaign.name}}
        || /^\{[^{}]+\}$/.test(s);    // {ad_name}, {campaign_name}
  }
  function buildKeyword(attr) {
    try {
      if (!attr) return 'mcsite';
      if (attr.utm_term     && !isMetaMacroLiteral(attr.utm_term))     return sanitize('fb_' + attr.utm_term);
      if (attr.utm_campaign && !isMetaMacroLiteral(attr.utm_campaign)) return sanitize('fb_' + attr.utm_campaign);
      if (attr.fbclid)       return 'fb';
      if (attr.utm_source   && !isMetaMacroLiteral(attr.utm_source))   return sanitize(attr.utm_source);
      return 'mcsite';
    } catch (e) { return 'mcsite'; }
  }

  // ─── Step 4: Idempotent keyword injection BEFORE hash ───
  function injectKeyword(url) {
    try {
      if (!url || typeof url !== 'string') return url;
      if (!isAffiliateLink(url)) return url;
      if (/[?&]keyword=/.test(url)) return url; // idempotent

      const kw = buildKeyword(readAttribution());
      if (!kw) return url;

      const hashIdx = url.indexOf('#');
      const beforeHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
      const hash       = hashIdx >= 0 ? url.slice(hashIdx)    : '';
      const sep = beforeHash.indexOf('?') >= 0 ? '&' : '?';
      const newUrl = beforeHash + sep + 'keyword=' + encodeURIComponent(kw) + hash;

      const host = (beforeHash.split('/')[2] || '').replace(/^www\./, '');
      log('keyword ' + kw + ' applied to ' + host);
      return newUrl;
    } catch (e) { return url; }
  }

  function isAffiliateLink(href) {
    try {
      if (typeof href !== 'string') return false;
      for (let i = 0; i < AFFILIATE_MATCHES.length; i++) {
        if (href.indexOf(AFFILIATE_MATCHES[i]) >= 0) return true;
      }
      return false;
    } catch (e) { return false; }
  }

  // ─── Step 5a: Delegated click listener on <a> tags ───
  function handleClick(e) {
    try {
      let el = e.target;
      while (el && el.nodeType === 1 && el.tagName !== 'A') el = el.parentElement;
      if (!el || el.tagName !== 'A') return;
      const href = el.getAttribute('href') || '';
      if (!isAffiliateLink(href)) return;
      const newHref = injectKeyword(href);
      if (newHref !== href) el.setAttribute('href', newHref);
    } catch (e) {}
  }

  // ─── Step 5b: window.open patch (catches mcOpenFirm in checkout drawer) ───
  function patchWindowOpen() {
    try {
      const _origOpen = window.open;
      if (typeof _origOpen !== 'function') return;
      if (window.open.__mcPatched) return;
      const wrapped = function (url, target, features) {
        try {
          if (typeof url === 'string' && isAffiliateLink(url)) {
            url = injectKeyword(url);
          }
        } catch (e) {}
        return _origOpen.call(window, url, target, features);
      };
      wrapped.__mcPatched = true;
      window.open = wrapped;
    } catch (e) {}
  }

  // ─── Step 5c: expose injectKeyword globally ───
  // Pra cobrir window.location.href em mcOpenFirm (não passa pelo patch de window.open).
  // Chamado em app.js:mcOpenFirm antes do redirect.
  try { window.mcInjectKeyword = injectKeyword; } catch (e) {}

  // ─── Init ───
  try {
    persistUtmsFromUrl();
    document.addEventListener('click', handleClick, true);
    patchWindowOpen();
    log('initialized');
  } catch (e) {}
})();
