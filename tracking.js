/**
 * tracking.js — sub_id (keyword) injection for Apex affiliate links
 *
 * Captures UTMs from URL on pageload (TTL 30d, last-touch).
 * On Apex link click OR window.open(apex...), injects ?keyword=fb_<utm_term>
 * BEFORE the hash anchor.
 *
 * SECURITY GUARANTEES:
 * - Failsafe: any error → original URL untouched (try/catch everywhere)
 * - Idempotent: re-running does not duplicate ?keyword=
 * - Feature flag TRACKING_ENABLED (set false → system off without redeploy)
 * - Only Apex (Bulenox/TPT excluded until confirmed)
 * - Does NOT touch CHECKOUT_FIRMS, FIRMS arrays, or cms_firms
 *
 * Loaded last via <script src="/tracking.js" defer></script>
 */
(function () {
  'use strict';

  const TRACKING_ENABLED = true;
  if (!TRACKING_ENABLED) return;

  const APEX_MATCH = 'apextraderfunding.com/member/aff/go/evertonmiranda';
  const STORAGE_KEY = 'mc_attribution';
  const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  const KEYWORD_PREFIX = 'fb_';
  const MAX_LEN = 100;

  // Dev detection: localhost, staging.*, *.vercel.app
  const IS_DEV = /^localhost$|^127\.|staging\.|\.vercel\.app$/i.test(location.hostname);

  function log(msg) {
    if (!IS_DEV) return;
    try { console.log('[mc-tracking]', msg); } catch (e) {}
  }

  function sanitize(s) {
    try {
      if (!s || typeof s !== 'string') return '';
      return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, MAX_LEN);
    } catch (e) { return ''; }
  }

  // ─── Step 1: Persist UTMs from URL into localStorage (TTL 30d, last-touch) ───
  function persistUtmsFromUrl() {
    try {
      const p = new URLSearchParams(location.search);
      const fromUrl = {
        utm_source:   p.get('utm_source')   || null,
        utm_medium:   p.get('utm_medium')   || null,
        utm_campaign: p.get('utm_campaign') || null,
        utm_content:  p.get('utm_content')  || null,
        utm_term:     p.get('utm_term')     || null,
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

  // ─── Step 2: Read sanitized utm_term from localStorage (respects TTL) ───
  function readUtmTerm() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return '';
      const attr = JSON.parse(raw) || {};
      if (attr.ts && Date.now() - attr.ts > TTL_MS) return '';
      return sanitize(attr.utm_term || '');
    } catch (e) { return ''; }
  }

  // ─── Step 3: Idempotent keyword injection BEFORE hash ───
  function injectKeyword(url) {
    try {
      if (!url || typeof url !== 'string') return url;
      if (url.indexOf(APEX_MATCH) < 0) return url;          // not an Apex link
      if (/[?&]keyword=/.test(url)) return url;              // idempotent
      const term = readUtmTerm();
      if (!term) return url;

      const kw = KEYWORD_PREFIX + term;
      const hashIdx = url.indexOf('#');
      const beforeHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
      const hash       = hashIdx >= 0 ? url.slice(hashIdx)    : '';
      const sep = beforeHash.indexOf('?') >= 0 ? '&' : '?';
      const newUrl = beforeHash + sep + 'keyword=' + encodeURIComponent(kw) + hash;

      log('keyword ' + kw + ' applied');
      return newUrl;
    } catch (e) { return url; }
  }

  function isApexAffiliateLink(href) {
    try {
      return typeof href === 'string' && href.indexOf(APEX_MATCH) >= 0;
    } catch (e) { return false; }
  }

  // ─── Step 4a: Delegated click listener on <a> tags ───
  function handleClick(e) {
    try {
      let el = e.target;
      while (el && el.nodeType === 1 && el.tagName !== 'A') el = el.parentElement;
      if (!el || el.tagName !== 'A') return;
      const href = el.getAttribute('href') || '';
      if (!isApexAffiliateLink(href)) return;
      const newHref = injectKeyword(href);
      if (newHref !== href) el.setAttribute('href', newHref);
    } catch (e) {}
  }

  // ─── Step 4b: window.open patch (catches mcOpenFirm in checkout drawer) ───
  function patchWindowOpen() {
    try {
      const _origOpen = window.open;
      if (typeof _origOpen !== 'function') return;
      if (window.open.__mcPatched) return;
      const wrapped = function (url, target, features) {
        try {
          if (typeof url === 'string' && isApexAffiliateLink(url)) {
            url = injectKeyword(url);
          }
        } catch (e) {}
        return _origOpen.call(window, url, target, features);
      };
      wrapped.__mcPatched = true;
      window.open = wrapped;
    } catch (e) {}
  }

  // ─── Init ───
  try {
    persistUtmsFromUrl();
    document.addEventListener('click', handleClick, true);
    patchWindowOpen();
    log('initialized');
  } catch (e) {}
})();
