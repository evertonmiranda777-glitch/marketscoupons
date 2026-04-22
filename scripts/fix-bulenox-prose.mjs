#!/usr/bin/env node
// Replace stale $50OFF/$60OFF prose mentions with MARKET89 89% off messaging across 6 langs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Each lang: [ [find, replace], ... ]
const JOBS = {
  'pt/guides/bulenox-review.html': [
    ['preços mensais com cupons $50OFF/$60OFF', 'preços mensais com o cupom exclusivo MARKET89 (89% de desconto em todos os tiers)'],
    ['Os tiers de US$ 50K e US$ 100K têm cupons de desconto persistentes — $50OFF no 50K e $60OFF no 100K. Esses são os dois pontos de entrada mais populares.',
     'Todos os tiers aceitam o cupom exclusivo <code>MARKET89</code>, que aplica 89% de desconto sobre o preço cheio. O 50K (US$ 19,25/mês) e o 100K (US$ 23,65/mês) são os dois pontos de entrada mais populares.'],
    ['<strong>Cupons persistentes $50OFF / $60OFF</strong> nos tiers 50K e 100K',
     '<strong>Cupom exclusivo <code>MARKET89</code> com 89% de desconto</strong> em todos os tiers (25K a 250K)'],
    ['<strong>O cupom $50OFF / $60OFF sempre funciona?</strong>',
     '<strong>O cupom MARKET89 sempre funciona?</strong>'],
  ],
  'es/guides/bulenox-review.html': [
    ['precios mensuales con cupones $50OFF/$60OFF', 'precios mensuales con el cupón exclusivo MARKET89 (89% de descuento en todos los tiers)'],
    ['Los tiers de US$50K y US$100K tienen cupones de descuento persistentes — $50OFF en la 50K y $60OFF en la 100K. Estos son los dos puntos de entrada más populares.',
     'Todos los tiers aceptan el cupón exclusivo <code>MARKET89</code>, que aplica 89% de descuento sobre el precio completo. La 50K (US$19.25/mes) y la 100K (US$23.65/mes) son los dos puntos de entrada más populares.'],
    ['<strong>Cupones persistentes $50OFF / $60OFF</strong> en los tiers 50K y 100K',
     '<strong>Cupón exclusivo <code>MARKET89</code> con 89% de descuento</strong> en todos los tiers (25K a 250K)'],
    ['<strong>¿Siempre funciona el cupón $50OFF / $60OFF?</strong><br>Estos cupones son persistentes — han estado disponibles en la página pública de precios de Bulenox durante más de 12 meses. Solo aplican al primer mes de suscripción en la 50K y 100K respectivamente.',
     '<strong>¿Siempre funciona el cupón MARKET89?</strong><br>Sí. <code>MARKET89</code> es un cupón exclusivo de Markets Coupons con Bulenox y aplica 89% de descuento en todos los tiers (25K a 250K) — solo en el primer mes de suscripción.'],
  ],
  'fr/guides/bulenox-review.html': [
    ['tarifs mensuels avec coupons $50OFF/$60OFF', 'tarifs mensuels avec le coupon exclusif MARKET89 (89 % de réduction sur tous les paliers)'],
    ['50K US$ avec $50OFF est le sweet spot pour la plupart des traders.', '50K US$ avec le coupon MARKET89 (US$ 19,25/mois) est le sweet spot pour la plupart des traders.'],
    ['Les paliers 50K US$ et 100K US$ ont des coupons de réduction persistants — $50OFF sur le 50K et $60OFF sur le 100K. Ce sont les deux points d&#39;entrée les plus populaires.',
     'Tous les paliers acceptent le coupon exclusif <code>MARKET89</code>, qui applique 89 % de réduction sur le prix complet. Le 50K (US$ 19,25/mois) et le 100K (US$ 23,65/mois) sont les deux points d&#39;entrée les plus populaires.'],
    ['<strong>Coupons persistants $50OFF / $60OFF</strong> sur les paliers 50K et 100K',
     '<strong>Coupon exclusif <code>MARKET89</code> avec 89 % de réduction</strong> sur tous les paliers (25K à 250K)'],
    ['<strong>Le coupon $50OFF / $60OFF fonctionne-t-il toujours ?</strong><br>Ces coupons sont persistants — ils sont disponibles sur la page de tarifs publique de Bulenox depuis plus de 12 mois. Ils s&#39;appliquent au premier mois d&#39;abonnement seulement sur le 50K et le 100K respectivement.',
     '<strong>Le coupon MARKET89 fonctionne-t-il toujours ?</strong><br>Oui. <code>MARKET89</code> est un coupon exclusif Markets Coupons × Bulenox et applique 89 % de réduction sur tous les paliers (25K à 250K) — uniquement sur le premier mois d&#39;abonnement.'],
  ],
  'de/guides/bulenox-review.html': [
    ['monatliche Preise mit $50OFF/$60OFF-Coupons', 'monatliche Preise mit dem exklusiven MARKET89-Coupon (89 % Rabatt auf allen Stufen)'],
    ['Die 50K- und 100K-Stufen haben dauerhafte Rabatt-Coupons — $50OFF auf der 50K und $60OFF auf der 100K. Dies sind die beiden beliebtesten Einstiegspunkte.',
     'Alle Stufen akzeptieren den exklusiven Coupon <code>MARKET89</code>, der 89 % Rabatt auf den vollen Preis anwendet. Die 50K (US$ 19,25/Monat) und die 100K (US$ 23,65/Monat) sind die beiden beliebtesten Einstiegspunkte.'],
    ['<strong>Permanente $50OFF / $60OFF Coupons</strong> auf den 50K- und 100K-Stufen',
     '<strong>Exklusiver Coupon <code>MARKET89</code> mit 89 % Rabatt</strong> auf allen Stufen (25K bis 250K)'],
    ['<strong>Funktioniert der $50OFF / $60OFF Coupon immer?</strong>',
     '<strong>Funktioniert der MARKET89 Coupon immer?</strong>'],
  ],
  'it/guides/bulenox-review.html': [
    ['prezzi mensili con coupon $50OFF/$60OFF', 'prezzi mensili con il coupon esclusivo MARKET89 (89 % di sconto su tutte le fasce)'],
    ['Le fasce US$50K e US$100K hanno coupon di sconto persistenti — $50OFF sul 50K e $60OFF sul 100K. Questi sono i due punti d&#39;ingresso più popolari.',
     'Tutte le fasce accettano il coupon esclusivo <code>MARKET89</code>, che applica 89 % di sconto sul prezzo pieno. Il 50K (US$ 19,25/mese) e il 100K (US$ 23,65/mese) sono i due punti d&#39;ingresso più popolari.'],
    ['<strong>Coupon persistenti $50OFF / $60OFF</strong> sulle fasce 50K e 100K',
     '<strong>Coupon esclusivo <code>MARKET89</code> con 89 % di sconto</strong> su tutte le fasce (25K a 250K)'],
    ['<strong>Il coupon $50OFF / $60OFF funziona sempre?</strong>',
     '<strong>Il coupon MARKET89 funziona sempre?</strong>'],
  ],
  'ar/guides/bulenox-review.html': [
    ['الأسعار الشهرية مع كوبونات $50OFF و$60OFF', 'الأسعار الشهرية مع كوبون MARKET89 الحصري (خصم 89% على جميع المستويات)'],
    ['مستويا 50K و 100K لديهما كوبونات خصم دائمة — $50OFF على 50K و $60OFF على 100K. هاتان هما نقطتا الدخول الأكثر شعبية.',
     'جميع المستويات تقبل كوبون <code>MARKET89</code> الحصري الذي يطبّق خصم 89% على السعر الكامل. مستوى 50K (19.25 US$/شهر) و 100K (23.65 US$/شهر) هما نقطتا الدخول الأكثر شعبية.'],
    ['<strong>كوبونات $50OFF / $60OFF دائمة</strong> على مستويي 50K و 100K',
     '<strong>كوبون <code>MARKET89</code> الحصري بخصم 89%</strong> على جميع المستويات (من 25K إلى 250K)'],
    ['<strong>هل يعمل كوبون $50OFF / $60OFF دائماً؟</strong><br>هذه الكوبونات دائمة — ظلت متاحة على صفحة تسعير Bulenox العامة لأكثر من 12 شهراً. يتم تطبيقها على الشهر الأول من الاشتراك فقط على 50K و 100K على التوالي.',
     '<strong>هل يعمل كوبون MARKET89 دائماً؟</strong><br>نعم. <code>MARKET89</code> هو كوبون حصري لـ Markets Coupons مع Bulenox ويطبّق خصم 89% على جميع المستويات (من 25K إلى 250K) — فقط على الشهر الأول من الاشتراك.'],
  ],
};

let totalFiles = 0, totalReplacements = 0, missed = [];
for (const [rel, jobs] of Object.entries(JOBS)) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.log(`SKIP (not found): ${rel}`); continue; }
  let src = fs.readFileSync(file, 'utf8');
  let fileReplacements = 0;
  for (const [from, to] of jobs) {
    // Meta description repeats 3x (description, og:description, twitter:description)
    const occurrences = src.split(from).length - 1;
    if (occurrences === 0) {
      missed.push(`${rel}: "${from.slice(0,60)}..."`);
      continue;
    }
    src = src.split(from).join(to);
    fileReplacements += occurrences;
  }
  fs.writeFileSync(file, src);
  totalFiles++;
  totalReplacements += fileReplacements;
  console.log(`✓ ${rel} — ${fileReplacements} replacements`);
}

console.log(`\nDone: ${totalFiles} files, ${totalReplacements} replacements.`);
if (missed.length) {
  console.log(`\n⚠️  ${missed.length} patterns NOT matched:`);
  missed.forEach(m => console.log(`  - ${m}`));
}
