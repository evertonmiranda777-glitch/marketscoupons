#!/usr/bin/env node
import fs from 'fs';
const URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const A = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const html = fs.readFileSync('data/preview/blog-v2/risk-management-1r.v2.html', 'utf8');
function E(h){let b=h.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];b=b.replace(/<div class="wrap">\s*/i,'').replace(/\s*<\/div>\s*$/i,'').replace(/<header[^>]*class="hero"[\s\S]*?<\/header>/i,'').replace(/<h1[^>]*>[\s\S]*?<\/h1>/i,'').replace(/<p class="subtitle"[\s\S]*?<\/p>/i,'').replace(/<p class="meta"[\s\S]*?<\/p>/i,'');const s=h.match(/<style>([\s\S]*?)<\/style>/);return((s?`<style>${s[1]}</style>\n`:'')+b).trim();}
const body=E(html);
console.log(`Body: ${body.length} · SVGs: ${(body.match(/figure class="diagram"/g)||[]).length}`);
const post={slug:'risk-management-1r',lang:'en',title:'Risk Management with 1R, How Pros Stay Solvent and Compound for Decades',category:'Risk Management',level:'beginner',read_time:'48 min',icon:'🛡️',cover_url:'https://www.marketscoupons.com/img/blog-heros/risk-management-1r.jpg',excerpt:'The complete guide to 1R risk management: position sizing, expectancy, Kelly Criterion, drawdown survival, and the math that separates pros from gamblers.',sort_order:26,author:'Markets Coupons Research',body,active:true};
const r=await fetch(`${URL}/functions/v1/blog-bulk-upsert`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${A}`,apikey:A},body:JSON.stringify({posts:[post]})});
console.log('HTTP',r.status,(await r.text()).slice(0,300));
