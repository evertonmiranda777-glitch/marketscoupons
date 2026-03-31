#!/usr/bin/env node
/**
 * translate.js — MarketsCoupons Auto-Translator
 *
 * Traduz automaticamente todas as strings PT do index.html para
 * EN, ES, IT, FR, DE, AR via DeepL API.
 *
 * Uso: node translate.js
 *
 * Quando usar:
 *   - Após adicionar qualquer texto novo em PT no I18N do index.html
 *   - Após atualizar descrições de firmas, plataformas, FAQ, etc.
 */

const fs   = require('fs');
const https = require('https');
const path  = require('path');

// ─── Configuração ────────────────────────────────────────────────────────────

const FILE = path.join(__dirname, 'index.html');
const KEY_FILE = path.join(__dirname, '.deepl-key');
const API_URL = 'https://api-free.deepl.com/v2/translate';

const TARGETS = [
  { deepl: 'EN-US', code: 'en' },
  { deepl: 'ES',    code: 'es' },
  { deepl: 'IT',    code: 'it' },
  { deepl: 'FR',    code: 'fr' },
  { deepl: 'DE',    code: 'de' },
  { deepl: 'AR',    code: 'ar' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getKey() {
  if (process.env.DEEPL_KEY) return process.env.DEEPL_KEY.trim();
  try { return fs.readFileSync(KEY_FILE, 'utf-8').trim(); }
  catch { console.error('❌ Chave DeepL não encontrada. Crie o arquivo .deepl-key com sua chave.'); process.exit(1); }
}

async function apiPost(key, body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { reject(new Error(`Resposta inválida: ${buf.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function translateBatch(key, texts, targetLang) {
  const results = [];
  const CHUNK = 50;
  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK);
    const res = await apiPost(key, {
      text: chunk,
      source_lang: 'PT',
      target_lang: targetLang,
      tag_handling: 'html',
      preserve_formatting: true,
    });
    if (!res.translations) throw new Error(`DeepL erro (${targetLang}): ${JSON.stringify(res)}`);
    results.push(...res.translations.map(t => t.text));
    if (i + CHUNK < texts.length) await sleep(300);
  }
  return results;
}

function escapeVal(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildLangBlock(code, dict) {
  const entries = Object.entries(dict)
    .map(([k, v]) => `    ${k}:'${escapeVal(v)}'`)
    .join(',\n');
  return `  ${code}: {\n${entries},\n  }`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const key = getKey();
  console.log('📖 Lendo index.html...');
  let html = fs.readFileSync(FILE, 'utf-8');

  // Extrair objeto I18N
  const match = html.match(/const I18N = (\{[\s\S]*?\});\nlet _currentLang/);
  if (!match) throw new Error('❌ Objeto I18N não encontrado no index.html');

  let I18N;
  try {
    I18N = Function(`"use strict"; return (${match[1]});`)();
  } catch(e) {
    throw new Error(`❌ Falha ao parsear I18N: ${e.message}`);
  }

  const ptDict = I18N.pt;
  const keys   = Object.keys(ptDict);
  const values = keys.map(k => String(ptDict[k]));

  // Verificar uso antes de traduzir
  const usageRes = await new Promise((resolve, reject) => {
    https.get({
      hostname: 'api-free.deepl.com',
      path: '/v2/usage',
      headers: { 'Authorization': `DeepL-Auth-Key ${key}` }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve({}); } });
    }).on('error', reject);
  });

  if (usageRes.character_count !== undefined) {
    const used  = usageRes.character_count.toLocaleString();
    const limit = usageRes.character_limit.toLocaleString();
    console.log(`📊 Uso DeepL: ${used} / ${limit} chars\n`);
  }

  const totalChars = values.join('').length * TARGETS.length;
  console.log(`🔑 ${keys.length} strings × ${TARGETS.length} idiomas ≈ ${totalChars.toLocaleString()} chars\n`);

  const allTranslations = { pt: ptDict };

  for (const { deepl, code } of TARGETS) {
    process.stdout.write(`🌐 Traduzindo para ${deepl}... `);
    const translated = await translateBatch(key, values, deepl);
    const dict = {};
    keys.forEach((k, i) => { dict[k] = translated[i]; });
    allTranslations[code] = dict;
    console.log('✅');
    await sleep(200);
  }

  // Reconstruir bloco I18N
  const langOrder = ['pt', 'en', 'es', 'it', 'fr', 'de', 'ar'];
  const newI18N = `const I18N = {\n${langOrder.map(c => buildLangBlock(c, allTranslations[c])).join(',\n')}\n}`;

  const newHtml = html.replace(
    /const I18N = \{[\s\S]*?\};\nlet _currentLang/,
    `${newI18N};\nlet _currentLang`
  );

  if (newHtml === html) throw new Error('❌ Substituição falhou — bloco I18N não foi atualizado');

  fs.writeFileSync(FILE, newHtml, 'utf-8');

  console.log('\n✅ index.html atualizado com sucesso!');
  console.log('📦 Próximo passo:');
  console.log('   git add index.html && git commit -m "Atualizar traduções via DeepL" && git push origin main\n');
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
