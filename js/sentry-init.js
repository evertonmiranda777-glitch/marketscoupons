// Sentry error tracking — desabilitado até DSN ser configurado.
//
// PRA ATIVAR:
// 1. Cadastrar conta free em https://sentry.io/signup/ (5k errors/mês)
// 2. Criar projeto "JavaScript" → copiar DSN (formato https://xxx@oXXX.ingest.sentry.io/XXX)
// 3. Cola o DSN abaixo no lugar de '' (entre as aspas)
// 4. Commit + push + deploy
//
// Captura automaticamente: erros JS não tratados, promessas rejeitadas, fetch falhos.

(function () {
  // 👇 Cola DSN aqui (ex: 'https://abc123@o12345.ingest.sentry.io/67890')
  var DSN = '';

  if (!DSN) return; // gate — sem DSN, Sentry fica off
  if (typeof Sentry === 'undefined') {
    console.warn('[sentry-init] SDK não carregou — verificar CDN script tag');
    return;
  }

  var env = 'production';
  if (location.hostname.includes('vercel.app')) env = 'preview';
  if (location.hostname === 'localhost') env = 'development';

  Sentry.init({
    dsn: DSN,
    environment: env,
    release: 'marketscoupons@2026-04-27',
    tracesSampleRate: 0.1, // 10% das transações pra performance monitoring
    replaysSessionSampleRate: 0, // Session replay desligado (pago)
    replaysOnErrorSampleRate: 0,
    // Ignora ruído conhecido
    ignoreErrors: [
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'NetworkError',
      'AbortError',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Browser extensions
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
      /safari-extension:\/\//,
    ],
    denyUrls: [
      // Não captura erros de scripts de terceiros que a gente não controla
      /googletagmanager\.com/,
      /google-analytics\.com/,
      /connect\.facebook\.net/,
      /tradingview\.com/,
    ],
    beforeSend: function (event) {
      // Anonimiza email se aparecer em mensagem de erro
      if (event.message) {
        event.message = event.message.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>');
      }
      return event;
    },
  });

  // Tag user_id quando logado (sem PII — só ID hash)
  window.addEventListener('mc:user-logged-in', function (e) {
    if (e.detail && e.detail.userId) {
      Sentry.setUser({ id: e.detail.userId });
    }
  });
})();
