#!/usr/bin/env node
import fs from 'fs';
const U='https://qfwhduvutfumsaxnuofa.supabase.co';
const A='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2hkdXZ1dGZ1bXNheG51b2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzc5NDYsImV4cCI6MjA4OTk1Mzk0Nn0.efRel6U68misvPSRj8-p31-gOhzjXN4eIFMiloTNyk4';
const h=fs.readFileSync('data/preview/blog-v2/trailing-drawdown-vs-eod.v2.html','utf8');
function E(h){let b=h.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];b=b.replace(/<div class="wrap">\s*/i,'').replace(/\s*<\/div>\s*$/i,'').replace(/<header[^>]*class="hero"[\s\S]*?<\/header>/i,'').replace(/<h1[^>]*>[\s\S]*?<\/h1>/i,'').replace(/<p class="subtitle"[\s\S]*?<\/p>/i,'').replace(/<p class="meta"[\s\S]*?<\/p>/i,'');const s=h.match(/<style>([\s\S]*?)<\/style>/);return((s?`<style>${s[1]}</style>\n`:'')+b).trim();}
const body=E(h);
console.log(`Body: ${body.length} · SVGs: ${(body.match(/figure class="diagram"/g)||[]).length}`);
const post={slug:'trailing-drawdown-vs-eod',lang:'en',title:'Trailing Drawdown vs EOD vs Static, The Choice That Determines Your Prop Firm',category:'Prop Firms',level:'intermediate',read_time:'42 min',icon:'⚖️',cover_url:'https://www.marketscoupons.com/img/blog-heros/trailing-drawdown-vs-eod.jpg',excerpt:'Complete guide to drawdown types in prop firm evals, trailing intraday vs trailing EOD vs static · choose the one that fits YOUR strategy, not their marketing.',sort_order:28,author:'Markets Coupons Research',body,active:true};
const r=await fetch(`${U}/functions/v1/blog-bulk-upsert`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${A}`,apikey:A},body:JSON.stringify({posts:[post]})});
console.log('HTTP',r.status,(await r.text()).slice(0,300));
