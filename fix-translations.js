#!/usr/bin/env node
/**
 * fix-translations.js — Corrige problemas em traduções do I18N
 * Trabalha diretamente no texto do HTML, fazendo find/replace exato.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html');
let html = fs.readFileSync(FILE, 'utf-8');

// Extrair I18N para ler os valores
const match = html.match(/const I18N = (\{[\s\S]*?\});\r?\nlet _currentLang/);
if (!match) { console.error('I18N not found'); process.exit(1); }
const I18N = Function('"use strict"; return (' + match[1] + ');')();

const langs = ['en', 'es', 'it', 'fr', 'de', 'ar'];
let fixCount = 0;

// ─── 1. Corrigir HTML entities diretamente no source ───
// &#x27; → \' (escaped single quote in JS string)
// &amp; → &
// &quot; → (escaped: just remove since rarely needed)

// Fazer no texto bruto do HTML, não no objeto JS
// Match: qualquer string I18N que contenha &#x27;
const entityFixes = [
  [/&#x27;/g, "\\'"],   // HTML entity apostrophe → escaped JS apostrophe
  [/&amp;/g, '&'],      // HTML entity ampersand → literal &
  [/&quot;/g, '"'],      // HTML entity quote → literal "
];

// Extrair o bloco I18N como texto
const i18nStart = html.indexOf('const I18N = {');
const i18nEnd = html.indexOf('};\nlet _currentLang', i18nStart);
const i18nEndAlt = html.indexOf('};\r\nlet _currentLang', i18nStart);
const actualEnd = i18nEnd !== -1 ? i18nEnd : i18nEndAlt;

if (i18nStart === -1 || actualEnd === -1) {
  console.error('Could not find I18N block boundaries');
  process.exit(1);
}

let i18nBlock = html.substring(i18nStart, actualEnd + 1);
const originalBlock = i18nBlock;

// Fix entities
entityFixes.forEach(([pattern, replacement]) => {
  const before = (i18nBlock.match(pattern) || []).length;
  i18nBlock = i18nBlock.replace(pattern, replacement);
  if (before > 0) {
    console.log(`  ${pattern.source}: ${before} ocorrências corrigidas`);
    fixCount += before;
  }
});

// ─── 2. Corrigir termos técnicos traduzidos ───
// Estas substituições são feitas no bloco de texto

const termFixes = [
  // "Prop Firm(s)" — ES
  [/empresas de gestión de fondos/gi, 'prop firms'],
  [/empresas de gestión de capital/gi, 'prop firms'],
  [/empresas de gestión de carteras/gi, 'prop firms'],
  [/empresas de trading/gi, 'prop firms'],
  [/empresas de inversión/gi, 'prop firms'],
  [/empresa de trading de divisas/gi, 'prop firm forex'],
  [/empresas de prop trading/gi, 'prop firms'],
  [/empresa de prop trading/gi, 'prop firm'],
  // "Prop Firm(s)" — IT
  [/società di trading/gi, 'prop firms'],
  [/società di gestione di portafogli/gi, 'prop firms'],
  [/società di gestione/gi, 'prop firms'],
  [/aziende di trading/gi, 'prop firms'],
  [/azienda di trading/gi, 'prop firm'],
  [/società di prop trading/gi, 'prop firms'],
  // "Prop Firm(s)" — FR
  [/sociétés de trading/gi, 'prop firms'],
  [/société de trading/gi, 'prop firm'],
  [/sociétés de capital-risque/gi, 'prop firms'],
  [/société de capital-risque/gi, 'prop firm'],
  [/entreprises de trading/gi, 'prop firms'],
  [/entreprise de trading/gi, 'prop firm'],
  [/sociétés de gestion/gi, 'prop firms'],
  // "Prop Firm(s)" — DE
  [/Prop-Firmen/g, 'Prop Firms'],
  [/Prop-Firm\b/g, 'Prop Firm'],
  [/Handelsfirmen/gi, 'Prop Firms'],
  [/Handelsfirma/gi, 'Prop Firm'],
  // "Prop Firm(s)" — AR
  [/شركات التداول/g, 'Prop Firms'],
  [/شركة التداول/g, 'Prop Firm'],
  [/شركات الاستثمار/g, 'Prop Firms'],
  [/شركة الاستثمار/g, 'Prop Firm'],
  [/شركات التمويل الخاصة/g, 'Prop Firms'],
  [/شركة تداول/g, 'Prop Firm'],
  // "Split" em contextos de lucro
  [/reparto de beneficios/gi, 'Profit Split'],
  [/ripartizione degli utili/gi, 'Profit Split'],
  [/partage des bénéfices/gi, 'Profit Split'],
  [/Gewinnbeteiligung/gi, 'Profit Split'],
  // "Drawdown" traduzido
  [/reducción máxima/gi, 'Drawdown'],
  [/riduzione massima/gi, 'Drawdown'],
  [/perte maximale/gi, 'Drawdown'],
  // "Lifetime" traduzido
  [/de por vida/gi, 'lifetime'],
  [/a vita/gi, 'lifetime'],
  [/à vie/gi, 'lifetime'],
  [/lebenslang/gi, 'lifetime'],
  // EN hst_ate fix
  [/hst_ate:'Until'/g, "hst_ate:'Up to'"],
];

termFixes.forEach(([pattern, replacement]) => {
  const before = (i18nBlock.match(pattern) || []).length;
  if (before > 0) {
    i18nBlock = i18nBlock.replace(pattern, replacement);
    console.log(`  ${pattern.source || pattern}: ${before}x → ${replacement}`);
    fixCount += before;
  }
});

// Capitalizar "prop firms" no início de frases
i18nBlock = i18nBlock.replace(/:'prop firms/g, ":'Prop firms");
i18nBlock = i18nBlock.replace(/:'prop firm/g, ":'Prop firm");

// Aplicar de volta no HTML
html = html.substring(0, i18nStart) + i18nBlock + html.substring(actualEnd + 1);

fs.writeFileSync(FILE, html, 'utf-8');
console.log(`\n✅ Total: ${fixCount} correções aplicadas`);

// Verificar sintaxe
try {
  const html2 = fs.readFileSync(FILE, 'utf-8');
  const scripts = html2.match(/<script>([\s\S]*?)<\/script>/g);
  scripts.forEach((s, i) => {
    new Function(s.replace(/<\/?script>/g, ''));
  });
  console.log('✅ Sintaxe JS: OK');
} catch (e) {
  console.error('❌ ERRO de sintaxe:', e.message);
  // Reverter
  html = html.substring(0, i18nStart) + originalBlock + html.substring(actualEnd + 1);
  fs.writeFileSync(FILE, html, 'utf-8');
  console.log('⚠️ Revertido para versão anterior');
}

// Recontagem de entidades restantes
const html3 = fs.readFileSync(FILE, 'utf-8');
const block3 = html3.substring(html3.indexOf('const I18N = {'), html3.indexOf('let _currentLang'));
const remaining27 = (block3.match(/&#x27;/g) || []).length;
const remainingAmp = (block3.match(/&amp;/g) || []).length;
const remainingQuot = (block3.match(/&quot;/g) || []).length;
console.log(`Restantes — &#x27;: ${remaining27}, &amp;: ${remainingAmp}, &quot;: ${remainingQuot}`);
