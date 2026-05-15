module.exports = (req, res) => {
  if (req.query.key !== 'mc-2026-secret-dump-xyz') return res.status(401).end();
  res.json({ chat: process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '' });
};
