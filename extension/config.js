// Endpoint do edge function receiver
const MC_CONFIG = {
  endpoint: 'https://qfwhduvutfumsaxnuofa.supabase.co/functions/v1/finance-sync',
  // Anon key publica (protegida por RLS). Extensao so INSERE via edge function, nao le.
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4'
};
