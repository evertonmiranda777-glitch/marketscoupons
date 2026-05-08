#!/usr/bin/env node
const tok = process.env.TELEGRAM_BOT_TOKEN;
const cht = process.env.TELEGRAM_CHAT_ID;
const text = process.argv.slice(2).join(' ') || 'ping';
if(!tok||!cht){console.log('no telegram secrets');process.exit(0)}
fetch(`https://api.telegram.org/bot${tok}/sendMessage`,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({chat_id:cht,text,parse_mode:'HTML',disable_web_page_preview:true})
}).then(r=>r.json()).then(j=>console.log(j.ok?'sent':'failed:'+JSON.stringify(j)));
