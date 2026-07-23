// polyfills.js — rede de seguranca pra WebView velho (Instagram/Android <2020).
// Metodos ES2019-2021 que NAO existem em browser antigo e estouram TypeError em runtime
// (quebra feature, e se rodar no carregamento pode travar o app.js inteiro).
// Carregar ANTES de tudo. So instala se faltar (nao sobrescreve nativo). ZERO dependencia.
(function () {
  // Object.fromEntries (ES2019) — usado em SLUG_PAGES no carregamento do app.js
  if (!Object.fromEntries) {
    Object.fromEntries = function (iter) {
      var o = {};
      var arr = Array.isArray(iter) ? iter : Array.from(iter);
      for (var i = 0; i < arr.length; i++) { o[arr[i][0]] = arr[i][1]; }
      return o;
    };
  }
  // String.prototype.replaceAll (ES2021)
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (find, rep) {
      if (Object.prototype.toString.call(find) === '[object RegExp]') return this.replace(find, rep);
      return this.split(find).join(rep);
    };
  }
  // Array/String .at (ES2022)
  if (!Array.prototype.at) {
    Array.prototype.at = function (n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return (n < 0 || n >= this.length) ? undefined : this[n]; };
  }
  if (!String.prototype.at) {
    String.prototype.at = function (n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return (n < 0 || n >= this.length) ? undefined : this[n]; };
  }
  // Array.prototype.flat / flatMap (ES2019)
  if (!Array.prototype.flat) {
    Array.prototype.flat = function (d) { d = d === undefined ? 1 : d; return d > 0 ? this.reduce(function (a, v) { return a.concat(Array.isArray(v) ? v.flat(d - 1) : v); }, []) : this.slice(); };
  }
  if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function (fn, t) { return this.map(function (v, i, a) { return fn.call(t, v, i, a); }).flat(); };
  }
  // Object.hasOwn (ES2022)
  if (!Object.hasOwn) {
    Object.hasOwn = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  }
  // Promise.allSettled (ES2020)
  if (Promise && !Promise.allSettled) {
    Promise.allSettled = function (ps) {
      return Promise.all(Array.prototype.map.call(ps, function (p) {
        return Promise.resolve(p).then(function (v) { return { status: 'fulfilled', value: v }; }, function (e) { return { status: 'rejected', reason: e }; });
      }));
    };
  }
  // globalThis (ES2020)
  if (typeof globalThis === 'undefined') { try { window.globalThis = window; } catch (e) {} }
})();
