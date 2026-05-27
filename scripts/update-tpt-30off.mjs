#!/usr/bin/env node
// Update TPT: discount 50→30, recalculate all prices at 30% off, keep MARKET40 coupon
const URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';

function fmt(n) {
  // .50 if non-integer, else integer no decimals
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}
function newPrice(origStr) {
  const orig = parseFloat(origStr.replace('$', ''));
  return fmt(Math.round(orig * 0.7 * 2) / 2); // round to nearest .50
}

const prices = [
  { a: '25K',  n: newPrice('$150'), o: '$150' },
  { a: '50K',  n: newPrice('$170'), o: '$170' },
  { a: '75K',  n: newPrice('$245'), o: '$245' },
  { a: '100K', n: newPrice('$330'), o: '$330', pop: 1 },
  { a: '150K', n: newPrice('$360'), o: '$360' },
];

const checkout_plans = [
  { disc: newPrice('$150'), goal: 'Variavel', orig: '$150', size: '25K',  maxDD: 'EOD', capital: '$25,000',  featured: false },
  { disc: newPrice('$170'), goal: 'Variavel', orig: '$170', size: '50K',  maxDD: 'EOD', capital: '$50,000',  featured: false },
  { disc: newPrice('$245'), goal: 'Variavel', orig: '$245', size: '75K',  maxDD: 'EOD', capital: '$75,000',  featured: false },
  { disc: newPrice('$330'), goal: 'Variavel', orig: '$330', size: '100K', maxDD: 'EOD', capital: '$100,000', featured: true  },
  { disc: newPrice('$360'), goal: 'Variavel', orig: '$360', size: '150K', maxDD: 'EOD', capital: '$150,000', featured: false },
];

console.log('New prices:', JSON.stringify(prices, null, 2));
console.log('New checkout_plans:', JSON.stringify(checkout_plans, null, 2));

const body = {
  discount: 30,
  coupon: 'MARKET40',
  prices,
  checkout_plans,
};

const r = await fetch(`${URL}/rest/v1/cms_firms?id=eq.tpt`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Prefer': 'return=representation',
  },
  body: JSON.stringify(body),
});
console.log('HTTP', r.status);
console.log((await r.text()).slice(0, 400));
