// Helper pra padronizar respostas de erro sem vazar detalhes internos.
// Stack/message detalhada vai pro log do Vercel; client recebe só mensagem genérica.

function safeError(res, status, publicMsg, internalErr) {
  if (internalErr) {
    const msg = internalErr.message || String(internalErr);
    const stack = internalErr.stack || '';
    console.error('[' + status + '] ' + publicMsg + ' →', msg, stack ? '\n' + stack : '');
  }
  return res.status(status).json({ error: publicMsg });
}

module.exports = { safeError };
