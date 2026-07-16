#!/usr/bin/env node
/**
 * build-firm-pages.mjs , paginas dedicadas de firma, LEVES, nos 8 idiomas do site.
 *
 * Substitui as "shells" pesadas (copia do index.html) por paginas estaticas reais
 * (hero + cupom + planos + stats + FAQ + schema), no padrao das compare pages.
 * EN-default na raiz (/apex -> firms/apex.html), langs em /{lang}/apex ->
 * {lang}/firms/apex.html. Canonical proprio + hreflang (8 langs + x-default) + RTL (ar).
 *
 * Traducao 100% manual (eu, sem Gemini). Dados ao vivo do cms_firms.
 *
 * MODO PREVIEW (aprovacao): PREVIEW=apex node scripts/build-firm-pages.mjs
 *   -> gera firm-preview/apex-{lang}.html (8 arquivos), NAO mexe em /apex prod.
 * MODO FINAL: node scripts/build-firm-pages.mjs
 *   -> gera firms/{id}.html + {lang}/firms/{id}.html (todas as firmas x 8 langs).
 *
 * Uso: SUPABASE_ACCESS_TOKEN='sbp_...' [PREVIEW=apex] node scripts/build-firm-pages.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SBP = process.env.SUPABASE_ACCESS_TOKEN || '';
const SR = process.env.SUPABASE_SERVICE_ROLE || '';
const PREVIEW = process.env.PREVIEW || '';
const SB_URL = 'https://qfwhduvutfumsaxnuofa.supabase.co';
const PROJECT_REF = 'qfwhduvutfumsaxnuofa';
if (!SR && !SBP) { console.error('SUPABASE_ACCESS_TOKEN ou SUPABASE_SERVICE_ROLE obrigatorio'); process.exit(1); }

const LANGS = ['en', 'pt', 'es', 'it', 'fr', 'de', 'ar', 'id'];
const RTL = new Set(['ar']);
const HREFLANG = { en: 'en', pt: 'pt-BR', es: 'es', it: 'it', fr: 'fr', de: 'de', ar: 'ar', id: 'id' };
const LOCALE = { en: 'en-US', pt: 'pt-BR', es: 'es-ES', it: 'it-IT', fr: 'fr-FR', de: 'de-DE', ar: 'ar', id: 'id-ID' };
const ROUTE_IDS = new Set(['apex','bulenox','ftmo','fn','e2t','the5ers','fundingpips','brightfunded','e8','cti','tradeday','blueguardian','toponefutures','aquafutures','blueberryfutures','alphafutures','futureselite','goat','funded-futures-family']);
const LANG_NAME = { en: 'English', pt: 'Português', es: 'Español', it: 'Italiano', fr: 'Français', de: 'Deutsch', ar: 'العربية', id: 'Indonesia' };

// ── i18n: todas as strings de UI nos 8 idiomas ──
const T = {
  en: { back:'Back to site', off:'OFF', catFutures:'Futures', exclCoupon:'Exclusive Coupon', discLbl:'exclusive discount', from:'from', officialCoupon:'Official coupon', noCode:'No code needed', viaLink:'Discount applied via link', activate:'Activate now', reviews:'Trustpilot reviews', plansEye:'Plans with coupon', plansH2:'Choose your account size', plansSubApplied:'Prices with coupon', plansSubUpdated:'Updated', couponApplied:'applied', save:'You save', activateCoupon:'Activate with coupon', rulesEye:'Firm rules', rulesH2:'Everything you need to know', perksEye:'Perks & Restrictions', perksH2:"What's allowed and what's not", allowed:'Allowed', prohibited:'Prohibited', faqEye:'FAQ', faqH2:'Frequently asked questions', compareEye:'Compare', compareH2:'{s} vs other prop firms', othersEye:'Other firms', othersH2:'See all your options', ctaH3:'Ready to start with {s}?', ctaBuy:'Buy {s} evaluation', heroDesc:'{n} is one of the most recognized prop firms on the market. Buy your evaluation with the Markets coupon and save{d}.', upTo:' up to {p}%', st:{dd:'Drawdown',split:'Profit Split',target:'Profit Target',minDays:'Min. Days',eval:'Evaluation',scaling:'Scaling',leverage:'Leverage',maxAcc:'Max Accounts',consistency:'Consistency',payout:'Payout Speed',news:'News Trading',day1:'Day-1 Payout',days:'days',yes:'Yes',no:'No',allowedV:'Allowed',blocked:'Blocked'}, footLegal:'Markets Coupons is an independent comparison and coupon site. We may earn a commission when you buy through our links, at no extra cost to you. Trading involves risk.', footRights:'All rights reserved.', faq:[ {q:'What is the {n} coupon code?', a:(f)=>`${f.hasCoupon?`Use coupon <strong>${f.eCoupon}</strong> at ${f.eName} checkout`:`Exclusive discount applied automatically via our link`} for ${f.discount?f.discount+'% off':'a special discount'}.`}, {q:'How much is the cheapest {n} account?', a:(f)=>`${f.minP?`The cheapest account starts at $${f.minP} with the Markets coupon`:'Several account sizes available'}${f.savP?` (was $${f.origP}, you save $${f.savP})`:''}.`}, {q:'Does {s} allow news trading?', a:(f)=>f.news_trading?`Yes, ${f.eName} <strong>allows</strong> trading during economic news.`:`No, ${f.eName} <strong>blocks</strong> trading during news windows (usually a few minutes before/after).`}, {q:'Does {s} have Day-1 payout?', a:(f)=>f.day1_payout?`Yes, ${f.eName} allows withdrawals from Day 1 once you hit the funded target.`:`No, ${f.eName} requires a minimum period before the first payout.`}, {q:"What is {s}'s drawdown and profit target?", a:(f)=>`Drawdown: ${f.eDrawdown}. Profit Target: ${f.eTarget}. Profit Split: ${f.eSplit}.`}, {q:'What platforms does {s} offer?', a:(f)=>f.ePlatforms?`Supported platforms: ${f.ePlatforms}.`:`Platforms are listed at the firm's official checkout.`} ] },
  pt: { back:'Voltar ao site', off:'OFF', catFutures:'Futuros', exclCoupon:'Cupom Exclusivo', discLbl:'desconto exclusivo', from:'a partir de', officialCoupon:'Cupom oficial', noCode:'Sem código', viaLink:'Desconto aplicado via link', activate:'Ativar agora', reviews:'avaliações no Trustpilot', plansEye:'Planos com cupom', plansH2:'Escolha o tamanho da conta', plansSubApplied:'Preços com o cupom', plansSubUpdated:'Atualizado', couponApplied:'aplicado', save:'Você economiza', activateCoupon:'Ativar com cupom', rulesEye:'Regras da firma', rulesH2:'Tudo que você precisa saber', perksEye:'Vantagens & Restrições', perksH2:'O que pode e o que não pode', allowed:'Permitido', prohibited:'Proibido', faqEye:'FAQ', faqH2:'Perguntas frequentes', compareEye:'Comparar', compareH2:'{s} vs outras prop firms', othersEye:'Outras firmas', othersH2:'Veja todas as opções', ctaH3:'Pronto pra começar com {s}?', ctaBuy:'Comprar avaliação {s}', heroDesc:'A {n} é uma das prop firms mais reconhecidas do mercado. Compre sua avaliação com o cupom Markets e economize{d}.', upTo:' até {p}%', st:{dd:'Drawdown',split:'Profit Split',target:'Profit Target',minDays:'Dias Mín.',eval:'Avaliação',scaling:'Scaling',leverage:'Alavancagem',maxAcc:'Máx. Contas',consistency:'Consistência',payout:'Velocidade Payout',news:'News Trading',day1:'Payout Day-1',days:'dias',yes:'Sim',no:'Não',allowedV:'Permitido',blocked:'Bloqueado'}, footLegal:'A Markets Coupons é um site independente de comparação e cupons. Podemos receber comissão quando você compra pelos nossos links, sem custo extra pra você. Trading envolve risco.', footRights:'Todos os direitos reservados.', faq:[ {q:'Qual o cupom de desconto da {n}?', a:(f)=>`${f.hasCoupon?`Use o cupom <strong>${f.eCoupon}</strong> no checkout da ${f.eName}`:`Desconto exclusivo aplicado automaticamente pelo nosso link`} pra ${f.discount?f.discount+'% de desconto':'um desconto especial'}.`}, {q:'Quanto custa a conta mais barata na {n}?', a:(f)=>`${f.minP?`A conta mais barata começa em $${f.minP} com o cupom Markets`:'Vários tamanhos de conta disponíveis'}${f.savP?` (era $${f.origP}, você economiza $${f.savP})`:''}.`}, {q:'A {s} permite news trading?', a:(f)=>f.news_trading?`Sim, a ${f.eName} <strong>permite</strong> operar durante notícias econômicas.`:`Não, a ${f.eName} <strong>bloqueia</strong> trades durante janelas de notícias (geralmente alguns minutos antes/depois).`}, {q:'Tem Day-1 payout na {s}?', a:(f)=>f.day1_payout?`Sim, a ${f.eName} libera saque desde o Day-1 assim que você bate o target da conta paga.`:`Não, a ${f.eName} exige um período mínimo antes do primeiro payout.`}, {q:'Qual o drawdown e profit target da {s}?', a:(f)=>`Drawdown: ${f.eDrawdown}. Profit Target: ${f.eTarget}. Profit Split: ${f.eSplit}.`}, {q:'Quais plataformas a {s} oferece?', a:(f)=>f.ePlatforms?`Plataformas suportadas: ${f.ePlatforms}.`:`As plataformas estão no checkout oficial da firma.`} ] },
  es: { back:'Volver al sitio', off:'OFF', catFutures:'Futuros', exclCoupon:'Cupón Exclusivo', discLbl:'descuento exclusivo', from:'desde', officialCoupon:'Cupón oficial', noCode:'Sin código', viaLink:'Descuento aplicado por enlace', activate:'Activar ahora', reviews:'reseñas en Trustpilot', plansEye:'Planes con cupón', plansH2:'Elige el tamaño de tu cuenta', plansSubApplied:'Precios con el cupón', plansSubUpdated:'Actualizado', couponApplied:'aplicado', save:'Ahorras', activateCoupon:'Activar con cupón', rulesEye:'Reglas de la firma', rulesH2:'Todo lo que necesitas saber', perksEye:'Ventajas y Restricciones', perksH2:'Qué se puede y qué no', allowed:'Permitido', prohibited:'Prohibido', faqEye:'FAQ', faqH2:'Preguntas frecuentes', compareEye:'Comparar', compareH2:'{s} vs otras prop firms', othersEye:'Otras firmas', othersH2:'Mira todas tus opciones', ctaH3:'¿Listo para empezar con {s}?', ctaBuy:'Comprar evaluación {s}', heroDesc:'{n} es una de las prop firms más reconocidas del mercado. Compra tu evaluación con el cupón Markets y ahorra{d}.', upTo:' hasta {p}%', st:{dd:'Drawdown',split:'Profit Split',target:'Profit Target',minDays:'Días Mín.',eval:'Evaluación',scaling:'Escalado',leverage:'Apalancamiento',maxAcc:'Máx. Cuentas',consistency:'Consistencia',payout:'Velocidad de Pago',news:'News Trading',day1:'Pago Día-1',days:'días',yes:'Sí',no:'No',allowedV:'Permitido',blocked:'Bloqueado'}, footLegal:'Markets Coupons es un sitio independiente de comparación y cupones. Podemos ganar una comisión cuando compras por nuestros enlaces, sin costo extra para ti. Operar conlleva riesgo.', footRights:'Todos los derechos reservados.', faq:[ {q:'¿Cuál es el cupón de {n}?', a:(f)=>`${f.hasCoupon?`Usa el cupón <strong>${f.eCoupon}</strong> en el checkout de ${f.eName}`:`Descuento exclusivo aplicado automáticamente por nuestro enlace`} para ${f.discount?f.discount+'% de descuento':'un descuento especial'}.`}, {q:'¿Cuánto cuesta la cuenta más barata de {n}?', a:(f)=>`${f.minP?`La cuenta más barata empieza en $${f.minP} con el cupón Markets`:'Varios tamaños de cuenta disponibles'}${f.savP?` (era $${f.origP}, ahorras $${f.savP})`:''}.`}, {q:'¿{s} permite news trading?', a:(f)=>f.news_trading?`Sí, ${f.eName} <strong>permite</strong> operar durante noticias económicas.`:`No, ${f.eName} <strong>bloquea</strong> operar durante ventanas de noticias (unos minutos antes/después).`}, {q:'¿{s} tiene pago Día-1?', a:(f)=>f.day1_payout?`Sí, ${f.eName} permite retirar desde el Día-1 al alcanzar el objetivo de la cuenta financiada.`:`No, ${f.eName} exige un periodo mínimo antes del primer pago.`}, {q:'¿Cuál es el drawdown y profit target de {s}?', a:(f)=>`Drawdown: ${f.eDrawdown}. Profit Target: ${f.eTarget}. Profit Split: ${f.eSplit}.`}, {q:'¿Qué plataformas ofrece {s}?', a:(f)=>f.ePlatforms?`Plataformas soportadas: ${f.ePlatforms}.`:`Las plataformas están en el checkout oficial de la firma.`} ] },
  it: { back:'Torna al sito', off:'OFF', catFutures:'Futures', exclCoupon:'Coupon Esclusivo', discLbl:'sconto esclusivo', from:'da', officialCoupon:'Coupon ufficiale', noCode:'Nessun codice', viaLink:'Sconto applicato via link', activate:'Attiva ora', reviews:'recensioni su Trustpilot', plansEye:'Piani con coupon', plansH2:'Scegli la dimensione del conto', plansSubApplied:'Prezzi con il coupon', plansSubUpdated:'Aggiornato', couponApplied:'applicato', save:'Risparmi', activateCoupon:'Attiva con coupon', rulesEye:'Regole della firm', rulesH2:'Tutto quello che devi sapere', perksEye:'Vantaggi e Restrizioni', perksH2:'Cosa si può e cosa no', allowed:'Consentito', prohibited:'Vietato', faqEye:'FAQ', faqH2:'Domande frequenti', compareEye:'Confronta', compareH2:'{s} vs altre prop firm', othersEye:'Altre firm', othersH2:'Vedi tutte le opzioni', ctaH3:'Pronto a iniziare con {s}?', ctaBuy:'Acquista valutazione {s}', heroDesc:'{n} è una delle prop firm più riconosciute sul mercato. Acquista la tua valutazione con il coupon Markets e risparmia{d}.', upTo:' fino al {p}%', st:{dd:'Drawdown',split:'Profit Split',target:'Profit Target',minDays:'Giorni Min.',eval:'Valutazione',scaling:'Scaling',leverage:'Leva',maxAcc:'Max Conti',consistency:'Coerenza',payout:'Velocità Payout',news:'News Trading',day1:'Payout Day-1',days:'giorni',yes:'Sì',no:'No',allowedV:'Consentito',blocked:'Bloccato'}, footLegal:'Markets Coupons è un sito indipendente di confronto e coupon. Potremmo guadagnare una commissione quando acquisti tramite i nostri link, senza costi extra per te. Il trading comporta rischi.', footRights:'Tutti i diritti riservati.', faq:[ {q:'Qual è il coupon di {n}?', a:(f)=>`${f.hasCoupon?`Usa il coupon <strong>${f.eCoupon}</strong> al checkout di ${f.eName}`:`Sconto esclusivo applicato automaticamente dal nostro link`} per ${f.discount?f.discount+'% di sconto':'uno sconto speciale'}.`}, {q:'Quanto costa il conto più economico di {n}?', a:(f)=>`${f.minP?`Il conto più economico parte da $${f.minP} con il coupon Markets`:'Diverse dimensioni di conto disponibili'}${f.savP?` (era $${f.origP}, risparmi $${f.savP})`:''}.`}, {q:'{s} permette il news trading?', a:(f)=>f.news_trading?`Sì, ${f.eName} <strong>permette</strong> di operare durante le news economiche.`:`No, ${f.eName} <strong>blocca</strong> le operazioni durante le finestre di news (di solito qualche minuto prima/dopo).`}, {q:'{s} ha il payout Day-1?', a:(f)=>f.day1_payout?`Sì, ${f.eName} consente il prelievo dal Day-1 una volta raggiunto il target del conto funded.`:`No, ${f.eName} richiede un periodo minimo prima del primo payout.`}, {q:'Qual è il drawdown e il profit target di {s}?', a:(f)=>`Drawdown: ${f.eDrawdown}. Profit Target: ${f.eTarget}. Profit Split: ${f.eSplit}.`}, {q:'Quali piattaforme offre {s}?', a:(f)=>f.ePlatforms?`Piattaforme supportate: ${f.ePlatforms}.`:`Le piattaforme sono nel checkout ufficiale della firm.`} ] },
  fr: { back:'Retour au site', off:'OFF', catFutures:'Futures', exclCoupon:'Coupon Exclusif', discLbl:'réduction exclusive', from:'à partir de', officialCoupon:'Coupon officiel', noCode:'Sans code', viaLink:'Réduction appliquée via le lien', activate:'Activer maintenant', reviews:'avis sur Trustpilot', plansEye:'Plans avec coupon', plansH2:'Choisissez la taille de votre compte', plansSubApplied:'Prix avec le coupon', plansSubUpdated:'Mis à jour', couponApplied:'appliqué', save:'Vous économisez', activateCoupon:'Activer avec coupon', rulesEye:'Règles de la firm', rulesH2:'Tout ce que vous devez savoir', perksEye:'Avantages et Restrictions', perksH2:'Ce qui est permis et interdit', allowed:'Autorisé', prohibited:'Interdit', faqEye:'FAQ', faqH2:'Questions fréquentes', compareEye:'Comparer', compareH2:'{s} vs autres prop firms', othersEye:'Autres firms', othersH2:'Voyez toutes vos options', ctaH3:'Prêt à commencer avec {s} ?', ctaBuy:'Acheter l\'évaluation {s}', heroDesc:'{n} est l\'une des prop firms les plus reconnues du marché. Achetez votre évaluation avec le coupon Markets et économisez{d}.', upTo:' jusqu\'à {p}%', st:{dd:'Drawdown',split:'Profit Split',target:'Profit Target',minDays:'Jours Min.',eval:'Évaluation',scaling:'Scaling',leverage:'Levier',maxAcc:'Max Comptes',consistency:'Cohérence',payout:'Vitesse de Paiement',news:'News Trading',day1:'Paiement Jour-1',days:'jours',yes:'Oui',no:'Non',allowedV:'Autorisé',blocked:'Bloqué'}, footLegal:'Markets Coupons est un site indépendant de comparaison et de coupons. Nous pouvons gagner une commission lorsque vous achetez via nos liens, sans coût supplémentaire pour vous. Le trading comporte des risques.', footRights:'Tous droits réservés.', faq:[ {q:'Quel est le coupon de {n} ?', a:(f)=>`${f.hasCoupon?`Utilisez le coupon <strong>${f.eCoupon}</strong> au checkout de ${f.eName}`:`Réduction exclusive appliquée automatiquement via notre lien`} pour ${f.discount?f.discount+'% de réduction':'une réduction spéciale'}.`}, {q:'Combien coûte le compte le moins cher de {n} ?', a:(f)=>`${f.minP?`Le compte le moins cher démarre à $${f.minP} avec le coupon Markets`:'Plusieurs tailles de compte disponibles'}${f.savP?` (était $${f.origP}, vous économisez $${f.savP})`:''}.`}, {q:'{s} autorise-t-elle le news trading ?', a:(f)=>f.news_trading?`Oui, ${f.eName} <strong>autorise</strong> le trading pendant les news économiques.`:`Non, ${f.eName} <strong>bloque</strong> le trading pendant les fenêtres de news (quelques minutes avant/après en général).`}, {q:'{s} propose-t-elle un paiement Jour-1 ?', a:(f)=>f.day1_payout?`Oui, ${f.eName} permet les retraits dès le Jour-1 une fois l\'objectif du compte financé atteint.`:`Non, ${f.eName} exige une période minimale avant le premier paiement.`}, {q:'Quel est le drawdown et le profit target de {s} ?', a:(f)=>`Drawdown : ${f.eDrawdown}. Profit Target : ${f.eTarget}. Profit Split : ${f.eSplit}.`}, {q:'Quelles plateformes {s} propose-t-elle ?', a:(f)=>f.ePlatforms?`Plateformes prises en charge : ${f.ePlatforms}.`:`Les plateformes sont indiquées au checkout officiel de la firm.`} ] },
  de: { back:'Zurück zur Seite', off:'OFF', catFutures:'Futures', exclCoupon:'Exklusiver Gutschein', discLbl:'exklusiver Rabatt', from:'ab', officialCoupon:'Offizieller Gutschein', noCode:'Kein Code nötig', viaLink:'Rabatt über den Link angewendet', activate:'Jetzt aktivieren', reviews:'Trustpilot-Bewertungen', plansEye:'Pläne mit Gutschein', plansH2:'Wähle deine Kontogröße', plansSubApplied:'Preise mit dem Gutschein', plansSubUpdated:'Aktualisiert', couponApplied:'angewendet', save:'Du sparst', activateCoupon:'Mit Gutschein aktivieren', rulesEye:'Firmen-Regeln', rulesH2:'Alles, was du wissen musst', perksEye:'Vorteile & Einschränkungen', perksH2:'Was erlaubt ist und was nicht', allowed:'Erlaubt', prohibited:'Verboten', faqEye:'FAQ', faqH2:'Häufige Fragen', compareEye:'Vergleichen', compareH2:'{s} vs andere Prop Firms', othersEye:'Andere Firmen', othersH2:'Sieh dir alle Optionen an', ctaH3:'Bereit, mit {s} zu starten?', ctaBuy:'{s}-Evaluation kaufen', heroDesc:'{n} ist eine der bekanntesten Prop Firms am Markt. Kaufe deine Evaluation mit dem Markets-Gutschein und spare{d}.', upTo:' bis zu {p}%', st:{dd:'Drawdown',split:'Profit Split',target:'Profit Target',minDays:'Min. Tage',eval:'Evaluation',scaling:'Scaling',leverage:'Hebel',maxAcc:'Max Konten',consistency:'Konsistenz',payout:'Auszahlungstempo',news:'News Trading',day1:'Day-1 Auszahlung',days:'Tage',yes:'Ja',no:'Nein',allowedV:'Erlaubt',blocked:'Blockiert'}, footLegal:'Markets Coupons ist eine unabhängige Vergleichs- und Gutscheinseite. Wir können eine Provision verdienen, wenn du über unsere Links kaufst, ohne Mehrkosten für dich. Trading ist mit Risiken verbunden.', footRights:'Alle Rechte vorbehalten.', faq:[ {q:'Wie lautet der {n}-Gutschein?', a:(f)=>`${f.hasCoupon?`Nutze den Gutschein <strong>${f.eCoupon}</strong> im ${f.eName}-Checkout`:`Exklusiver Rabatt wird automatisch über unseren Link angewendet`} für ${f.discount?f.discount+'% Rabatt':'einen Sonderrabatt'}.`}, {q:'Was kostet das günstigste {n}-Konto?', a:(f)=>`${f.minP?`Das günstigste Konto startet bei $${f.minP} mit dem Markets-Gutschein`:'Mehrere Kontogrößen verfügbar'}${f.savP?` (war $${f.origP}, du sparst $${f.savP})`:''}.`}, {q:'Erlaubt {s} News Trading?', a:(f)=>f.news_trading?`Ja, ${f.eName} <strong>erlaubt</strong> das Trading während Wirtschaftsnews.`:`Nein, ${f.eName} <strong>blockiert</strong> das Trading während News-Fenstern (meist einige Minuten davor/danach).`}, {q:'Hat {s} Day-1-Auszahlung?', a:(f)=>f.day1_payout?`Ja, ${f.eName} erlaubt Auszahlungen ab Tag 1, sobald du das Ziel des Funded-Kontos erreichst.`:`Nein, ${f.eName} verlangt eine Mindestzeit vor der ersten Auszahlung.`}, {q:'Wie hoch sind Drawdown und Profit Target bei {s}?', a:(f)=>`Drawdown: ${f.eDrawdown}. Profit Target: ${f.eTarget}. Profit Split: ${f.eSplit}.`}, {q:'Welche Plattformen bietet {s}?', a:(f)=>f.ePlatforms?`Unterstützte Plattformen: ${f.ePlatforms}.`:`Die Plattformen stehen im offiziellen Checkout der Firma.`} ] },
  ar: { back:'العودة إلى الموقع', off:'خصم', catFutures:'عقود آجلة', exclCoupon:'كوبون حصري', discLbl:'خصم حصري', from:'يبدأ من', officialCoupon:'كوبون رسمي', noCode:'بدون كود', viaLink:'يُطبَّق الخصم عبر الرابط', activate:'فعّل الآن', reviews:'تقييم على Trustpilot', plansEye:'الخطط مع الكوبون', plansH2:'اختر حجم حسابك', plansSubApplied:'الأسعار مع الكوبون', plansSubUpdated:'آخر تحديث', couponApplied:'مطبّق', save:'توفّر', activateCoupon:'فعّل بالكوبون', rulesEye:'قواعد الشركة', rulesH2:'كل ما تحتاج معرفته', perksEye:'المزايا والقيود', perksH2:'ما هو مسموح وما هو ممنوع', allowed:'مسموح', prohibited:'ممنوع', faqEye:'الأسئلة الشائعة', faqH2:'أسئلة متكررة', compareEye:'قارن', compareH2:'{s} مقابل شركات أخرى', othersEye:'شركات أخرى', othersH2:'اطّلع على كل الخيارات', ctaH3:'جاهز للبدء مع {s}؟', ctaBuy:'اشترِ تقييم {s}', heroDesc:'{n} من أكثر شركات التمويل شهرةً في السوق. اشترِ تقييمك بكوبون Markets ووفّر{d}.', upTo:' حتى {p}%', st:{dd:'الحد الأقصى للخسارة',split:'نسبة الأرباح',target:'هدف الربح',minDays:'أيام كحد أدنى',eval:'التقييم',scaling:'التوسّع',leverage:'الرافعة',maxAcc:'أقصى عدد حسابات',consistency:'الاتساق',payout:'سرعة السحب',news:'التداول وقت الأخبار',day1:'سحب اليوم الأول',days:'أيام',yes:'نعم',no:'لا',allowedV:'مسموح',blocked:'محظور'}, footLegal:'Markets Coupons موقع مستقل للمقارنة والكوبونات. قد نحصل على عمولة عند الشراء عبر روابطنا دون أي تكلفة إضافية عليك. ينطوي التداول على مخاطر.', footRights:'جميع الحقوق محفوظة.', faq:[ {q:'ما هو كوبون خصم {n}؟', a:(f)=>`${f.hasCoupon?`استخدم الكوبون <strong>${f.eCoupon}</strong> عند الدفع في ${f.eName}`:`يُطبَّق الخصم الحصري تلقائيًا عبر رابطنا`} للحصول على ${f.discount?f.discount+'% خصم':'خصم خاص'}.`}, {q:'كم سعر أرخص حساب في {n}؟', a:(f)=>`${f.minP?`يبدأ أرخص حساب من $${f.minP} بكوبون Markets`:'تتوفر أحجام حسابات متعددة'}${f.savP?` (كان $${f.origP}، توفّر $${f.savP})`:''}.`}, {q:'هل تسمح {s} بالتداول وقت الأخبار؟', a:(f)=>f.news_trading?`نعم، ${f.eName} <strong>تسمح</strong> بالتداول أثناء الأخبار الاقتصادية.`:`لا، ${f.eName} <strong>تمنع</strong> التداول أثناء نوافذ الأخبار (عادةً دقائق قبل/بعد).`}, {q:'هل لدى {s} سحب في اليوم الأول؟', a:(f)=>f.day1_payout?`نعم، ${f.eName} تتيح السحب من اليوم الأول بمجرد تحقيق هدف الحساب المموّل.`:`لا، ${f.eName} تشترط فترة دنيا قبل أول سحب.`}, {q:'ما هو الحد الأقصى للخسارة وهدف الربح في {s}؟', a:(f)=>`الحد الأقصى للخسارة: ${f.eDrawdown}. هدف الربح: ${f.eTarget}. نسبة الأرباح: ${f.eSplit}.`}, {q:'ما المنصات التي تقدمها {s}؟', a:(f)=>f.ePlatforms?`المنصات المدعومة: ${f.ePlatforms}.`:`المنصات مذكورة في صفحة الدفع الرسمية للشركة.`} ] },
  id: { back:'Kembali ke situs', off:'OFF', catFutures:'Futures', exclCoupon:'Kupon Eksklusif', discLbl:'diskon eksklusif', from:'mulai dari', officialCoupon:'Kupon resmi', noCode:'Tanpa kode', viaLink:'Diskon diterapkan lewat tautan', activate:'Aktifkan sekarang', reviews:'ulasan Trustpilot', plansEye:'Paket dengan kupon', plansH2:'Pilih ukuran akun kamu', plansSubApplied:'Harga dengan kupon', plansSubUpdated:'Diperbarui', couponApplied:'diterapkan', save:'Kamu hemat', activateCoupon:'Aktifkan dengan kupon', rulesEye:'Aturan firm', rulesH2:'Semua yang perlu kamu tahu', perksEye:'Keunggulan & Batasan', perksH2:'Yang boleh dan yang tidak', allowed:'Diizinkan', prohibited:'Dilarang', faqEye:'FAQ', faqH2:'Pertanyaan umum', compareEye:'Bandingkan', compareH2:'{s} vs prop firm lain', othersEye:'Firm lain', othersH2:'Lihat semua pilihan', ctaH3:'Siap mulai dengan {s}?', ctaBuy:'Beli evaluasi {s}', heroDesc:'{n} adalah salah satu prop firm paling dikenal di pasar. Beli evaluasimu dengan kupon Markets dan hemat{d}.', upTo:' hingga {p}%', st:{dd:'Drawdown',split:'Profit Split',target:'Profit Target',minDays:'Hari Min.',eval:'Evaluasi',scaling:'Scaling',leverage:'Leverage',maxAcc:'Maks Akun',consistency:'Konsistensi',payout:'Kecepatan Payout',news:'News Trading',day1:'Payout Hari-1',days:'hari',yes:'Ya',no:'Tidak',allowedV:'Diizinkan',blocked:'Diblokir'}, footLegal:'Markets Coupons adalah situs perbandingan dan kupon independen. Kami bisa mendapat komisi saat kamu membeli lewat tautan kami, tanpa biaya tambahan untukmu. Trading mengandung risiko.', footRights:'Semua hak dilindungi.', faq:[ {q:'Apa kode kupon {n}?', a:(f)=>`${f.hasCoupon?`Pakai kupon <strong>${f.eCoupon}</strong> di checkout ${f.eName}`:`Diskon eksklusif diterapkan otomatis lewat tautan kami`} untuk ${f.discount?f.discount+'% diskon':'diskon spesial'}.`}, {q:'Berapa harga akun termurah {n}?', a:(f)=>`${f.minP?`Akun termurah mulai dari $${f.minP} dengan kupon Markets`:'Tersedia berbagai ukuran akun'}${f.savP?` (dulu $${f.origP}, kamu hemat $${f.savP})`:''}.`}, {q:'Apakah {s} mengizinkan news trading?', a:(f)=>f.news_trading?`Ya, ${f.eName} <strong>mengizinkan</strong> trading saat berita ekonomi.`:`Tidak, ${f.eName} <strong>memblokir</strong> trading saat jendela berita (biasanya beberapa menit sebelum/sesudah).`}, {q:'Apakah {s} punya payout Hari-1?', a:(f)=>f.day1_payout?`Ya, ${f.eName} mengizinkan penarikan sejak Hari-1 setelah kamu mencapai target akun funded.`:`Tidak, ${f.eName} mensyaratkan periode minimum sebelum payout pertama.`}, {q:'Berapa drawdown dan profit target {s}?', a:(f)=>`Drawdown: ${f.eDrawdown}. Profit Target: ${f.eTarget}. Profit Split: ${f.eSplit}.`}, {q:'Platform apa yang ditawarkan {s}?', a:(f)=>f.ePlatforms?`Platform yang didukung: ${f.ePlatforms}.`:`Platform tercantum di checkout resmi firm.`} ] },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const num = (s) => { const m = String(s ?? '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
const imgUrl = (p) => p ? `https://www.marketscoupons.com${String(p).startsWith('/') ? '' : '/'}${p}` : '';

async function loadFirms() {
  if (SR) {
    const r = await fetch(`${SB_URL}/rest/v1/cms_firms?active=eq.true&select=*&order=sort_order`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
    const d = await r.json(); if (Array.isArray(d) && d.length) return d;
  }
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'SELECT * FROM cms_firms WHERE active=true ORDER BY sort_order' }),
  });
  const d = await r.json();
  if (Array.isArray(d)) return d; console.error('Management API error:', d); return [];
}

function priceMin(prices, key) {
  if (!Array.isArray(prices) || !prices.length) return null;
  const nums = prices.map(p => num(p[key])).filter(n => n != null);
  return nums.length ? Math.min(...nums) : null;
}

// url do site pra uma firma id no idioma lang (EN=raiz)
// categoria localizada (o campo type do banco vem em PT: "Futuros"/"Forex"/combos)
function locType(raw, lang) {
  const s = String(raw || '').toLowerCase();
  const hasF = s.includes('futur'), hasX = s.includes('forex');
  const parts = [];
  if (hasF) parts.push(T[lang].catFutures);
  if (hasX) parts.push('Forex');
  if (!parts.length) return raw ? String(raw) : 'Prop Firm';
  return parts.join(' & ');
}
// URL da PÁGINA DE SEO (separada do checkout /{id}): /{id}-coupon
const firmUrl = (lang, id) => lang === 'en' ? `https://www.marketscoupons.com/${id}-coupon` : `https://www.marketscoupons.com/${lang}/${id}-coupon`;
const seoHref = (lang, id) => lang === 'en' ? `/${id}-coupon` : `/${lang}/${id}-coupon`;
const langHref = (lang, path) => lang === 'en' ? `/${path}` : `/${lang}/${path}`;

function genPage(f, allFirms, lang) {
  const t = T[lang];
  const rtl = RTL.has(lang);
  const loc = LOCALE[lang];
  const short = f.short_name || f.name.split(' ')[0];
  const hasCoupon = f.coupon && f.coupon.length <= 16 && f.discount > 0;
  const minP = priceMin(f.prices, 'n');
  const origP = priceMin(f.prices, 'o');
  const savP = (origP && minP && origP > minP) ? (origP - minP).toFixed(2) : null;
  const tpScore = f.trustpilot_score || f.rating;
  const tpReviews = f.trustpilot_reviews || f.reviews;
  const others = allFirms.filter(o => o.id !== f.id && ROUTE_IDS.has(o.id)).slice(0, 6);

  const fill = (s) => String(s).replaceAll('{n}', f.name).replaceAll('{s}', short).replaceAll('{p}', f.discount);
  const discSuffix = f.discount ? fill(t.upTo) : '';
  const title = hasCoupon
    ? `${f.name} Coupon, ${f.discount}% ${t.off} | ${f.coupon} | MarketsCoupons`
    : `${f.name}, ${t.plansEye} | MarketsCoupons`;
  const desc = hasCoupon
    ? fill(t.heroDesc).replace('{d}', discSuffix).replace(/\s+/g, ' ').trim()
    : fill(t.heroDesc).replace('{d}', discSuffix).replace(/\s+/g, ' ').trim();

  // dados pro FAQ (com esc)
  const fd = {
    hasCoupon, discount: f.discount, news_trading: !!f.news_trading, day1_payout: !!f.day1_payout,
    eName: esc(f.name), eCoupon: esc(f.coupon || ''),
    minP: minP ? minP.toFixed(2) : null, origP: origP ? origP.toFixed(2) : null, savP,
    eDrawdown: esc(f.drawdown || '—'), eTarget: esc(f.target || '—'), eSplit: esc(f.split || '—'),
    ePlatforms: Array.isArray(f.platforms) && f.platforms.length ? f.platforms.map(esc).join(', ') : '',
  };
  const faqs = t.faq.map(item => ({ q: fill(item.q), a: item.a(fd) }));

  const stats = [
    { lbl: t.st.dd, val: f.drawdown || '—' },
    { lbl: t.st.split, val: f.split || '—' },
    { lbl: t.st.target, val: f.target || '—' },
    { lbl: t.st.minDays, val: f.min_days ? `${f.min_days} ${t.st.days}` : '—' },
    { lbl: t.st.eval, val: f.eval_days ? `${f.eval_days} ${t.st.days}` : '—' },
    { lbl: t.st.scaling, val: f.scaling || '—' },
    { lbl: t.st.leverage, val: f.leverage || '—' },
    { lbl: t.st.maxAcc, val: f.max_accounts || '—' },
    { lbl: t.st.consistency, val: f.consistency || '—' },
    { lbl: t.st.payout, val: f.payout_speed || '—' },
    { lbl: t.st.news, val: f.news_trading ? t.st.allowedV : t.st.blocked, win: !!f.news_trading },
    { lbl: t.st.day1, val: f.day1_payout ? t.st.yes : t.st.no, win: !!f.day1_payout },
  ];

  const plansHtml = (Array.isArray(f.prices) && f.prices.length)
    ? f.prices.map(p => {
        const orig = num(p.o), fin = num(p.n);
        const sav = (orig && fin && orig > fin) ? (orig - fin).toFixed(2) : null;
        const pct = (orig && fin && orig > fin) ? Math.round((1 - fin / orig) * 100) : null;
        return `<div class="plan">
          <div class="plan-size">${esc(p.a || p.size || p.s || '—')}</div>
          ${pct ? `<div class="plan-pct">${pct}% ${esc(t.off)}</div>` : ''}
          <div class="plan-prices">
            ${orig ? `<div class="plan-orig">$${orig.toFixed(2)}</div>` : ''}
            <div class="plan-final">${fin ? `$${fin.toFixed(2)}` : '—'}</div>
          </div>
          ${sav ? `<div class="plan-save">${esc(t.save)} <strong>$${sav}</strong></div>` : ''}
          <a class="plan-cta" href="${esc(f.link || '#')}" target="_blank" rel="noopener sponsored">${esc(t.activateCoupon)}</a>
        </div>`;
      }).join('')
    : '';

  const perksHtml = Array.isArray(f.perks) && f.perks.length ? `<ul class="check-list">${f.perks.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
  const proibidoHtml = Array.isArray(f.proibido) && f.proibido.length ? `<ul class="x-list">${f.proibido.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
  const platformsHtml = Array.isArray(f.platforms) && f.platforms.length ? f.platforms.map(p => `<span class="plat-pill">${esc(p)}</span>`).join('') : '';

  const stars = (s) => { const n = parseFloat(s) || 0, full = Math.floor(n), half = (n - full) >= 0.5; return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0))); };

  const othersHtml = others.map(o => `<a class="other-card" href="${seoHref(lang, o.id)}" style="--c:${o.color || '#F0B429'}">
      ${o.icon_url ? `<img src="${esc(imgUrl(o.icon_url))}" alt="${esc(o.name)}" loading="lazy" width="48" height="48">` : ''}
      <div class="other-name">${esc(o.short_name || o.name)}</div>
      ${o.discount ? `<div class="other-disc">${o.discount}% ${esc(t.off)}</div>` : ''}
    </a>`).join('');

  const compareLinks = others.slice(0, 5).map(o => {
    const lhs = (o.sort_order ?? 99) < (f.sort_order ?? 99) ? o.id : f.id;
    const rhs = (o.sort_order ?? 99) < (f.sort_order ?? 99) ? f.id : o.id;
    return `<a class="cmp-link" href="${langHref(lang, lhs + '-vs-' + rhs)}">${esc(short)} <span style="opacity:.5">vs</span> ${esc(o.short_name || o.name.split(' ')[0])}</a>`;
  }).join('');

  // schema
  const productSchema = { '@context': 'https://schema.org', '@type': 'Product', name: `${f.name} Prop Firm Challenge`, description: desc, brand: { '@type': 'Brand', name: f.name }, image: f.icon_url ? imgUrl(f.icon_url) : undefined,
    offers: minP ? { '@type': 'Offer', priceCurrency: 'USD', price: minP.toFixed(2), url: firmUrl(lang, f.id), availability: 'https://schema.org/InStock' } : undefined,
    aggregateRating: (tpScore && tpReviews) ? { '@type': 'AggregateRating', ratingValue: tpScore, reviewCount: tpReviews, bestRating: 5 } : undefined };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a.replace(/<[^>]+>/g, '') } })) };
  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: lang === 'en' ? 'https://www.marketscoupons.com/' : `https://www.marketscoupons.com/${lang}/` }, { '@type': 'ListItem', position: 2, name: `${f.name} Coupon`, item: firmUrl(lang, f.id) } ] };

  // hreflang alternates
  const alternates = LANGS.map(l => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${firmUrl(l, f.id)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${firmUrl('en', f.id)}">`;

  // lang switcher
  const langSwitch = LANGS.map(l => `<a href="${firmUrl(l, f.id).replace('https://www.marketscoupons.com', '')}"${l === lang ? ' class="on"' : ''}>${LANG_NAME[l]}</a>`).join('');

  const dateStr = (() => { try { return new Date().toLocaleDateString(loc, { month: 'long', year: 'numeric' }); } catch (e) { return ''; } })();
  const reviewsStr = tpReviews ? (() => { try { return tpReviews.toLocaleString(loc); } catch (e) { return tpReviews; } })() : '';

  return `<!DOCTYPE html>
<html lang="${HREFLANG[lang]}"${rtl ? ' dir="rtl"' : ''}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(f.name)} coupon, ${esc(f.name)} coupon code, ${esc(f.name)} discount, ${esc(f.name)} promo code, ${esc(f.name)} review, prop firm coupon">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${firmUrl(lang, f.id)}">
${alternates}
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${firmUrl(lang, f.id)}">
<meta property="og:locale" content="${loc.replace('-', '_')}">
${f.icon_url ? `<meta property="og:image" content="${esc(imgUrl(f.icon_url))}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" type="image/svg+xml" href="/img/favicon.svg">
<link rel="icon" type="image/png" href="/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">${safeJson(productSchema)}</script>
<script type="application/ld+json">${safeJson(faqSchema)}</script>
<script type="application/ld+json">${safeJson(breadcrumbSchema)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#07090D;--sur:#0B0F16;--card:#10151F;--card2:#141B27;--b1:#1C2535;--b2:#263145;--gold:#F0B429;--green:#10B981;--red:#EF4444;--t1:#EDF2F7;--t2:#B8C5D6;--t3:#8A98AE;--c:${f.color || '#F0B429'}}
@keyframes shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
html,body{background:var(--bg);color:var(--t1);font-family:Inter,system-ui,sans-serif;line-height:1.55;min-height:100vh}
body{padding-bottom:0}
a{color:inherit}img{max-width:100%;display:block}
[dir=rtl] .plan-orig,[dir=rtl] .ch-code{direction:ltr;unicode-bidi:embed}
.fp-nav{padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--b1);background:rgba(8,12,18,.85);backdrop-filter:blur(8px);position:sticky;top:0;z-index:50;gap:12px;flex-wrap:wrap}
.fp-nav-logo{font-size:18px;font-weight:800;color:var(--t1);text-decoration:none;letter-spacing:-.01em}
.fp-nav-logo span{color:#ff8c00}
.fp-nav-right{display:flex;align-items:center;gap:14px}
.fp-nav-back{font-size:13px;color:var(--t3);text-decoration:none}
.fp-nav-back:hover{color:var(--gold)}
.fp-lang{position:relative}
.fp-lang summary{list-style:none;cursor:pointer;font-size:12px;color:var(--t2);border:1px solid var(--b1);border-radius:8px;padding:6px 12px;background:var(--card)}
.fp-lang summary::-webkit-details-marker{display:none}
.fp-lang-menu{position:absolute;top:calc(100% + 6px);inset-inline-end:0;background:var(--card);border:1px solid var(--b1);border-radius:10px;padding:6px;min-width:150px;z-index:60;box-shadow:0 12px 30px rgba(0,0,0,.5)}
.fp-lang-menu a{display:block;padding:8px 12px;font-size:13px;color:var(--t2);text-decoration:none;border-radius:7px}
.fp-lang-menu a:hover{background:var(--card2);color:var(--t1)}
.fp-lang-menu a.on{color:var(--gold);font-weight:700}
.fp-wrap{max-width:1100px;margin:0 auto;padding:0 20px}
.fp-hero{position:relative;padding:64px 0 40px;overflow:hidden;animation:fadeUp .5s ease}
.fp-hero-bg{position:absolute;inset:0;background-image:${f.bg_image ? `url('${esc(f.bg_image)}')` : 'none'};background-size:cover;background-position:center;opacity:.16;mix-blend-mode:luminosity;pointer-events:none}
.fp-hero-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,var(--bg) 92%)}
.fp-hero>*{position:relative;z-index:1}
.fp-hero-grid{display:grid;grid-template-columns:auto 1fr;gap:32px;align-items:center}
@media(max-width:760px){.fp-hero-grid{grid-template-columns:1fr;text-align:center}}
.fp-hero-logo{width:110px;height:110px;border-radius:24px;background:#0a0d14;padding:14px;border:1px solid color-mix(in srgb,var(--c) 30%,transparent);box-shadow:0 12px 32px color-mix(in srgb,var(--c) 22%,transparent)}
@media(max-width:760px){.fp-hero-logo{margin:0 auto}}
.fp-hero-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--c);font-weight:700;margin-bottom:10px}
.fp-h1{font-size:clamp(30px,6vw,50px);font-weight:900;letter-spacing:-.025em;line-height:1.05;margin-bottom:14px}
.fp-h1 .accent{background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 60%,#fff));-webkit-background-clip:text;background-clip:text;color:transparent}
.fp-hero-desc{font-size:15px;color:var(--t2);max-width:640px;line-height:1.65}
@media(max-width:760px){.fp-hero-desc{margin:0 auto}}
.coupon-highlight{margin:24px 0 16px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 18%,var(--card)) 0%,var(--card) 100%);border:2px dashed color-mix(in srgb,var(--c) 50%,transparent);border-radius:18px;padding:26px 24px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;animation:fadeUp .6s ease}
@media(max-width:760px){.coupon-highlight{grid-template-columns:1fr;text-align:center}}
.ch-disc{font-size:52px;font-weight:900;line-height:1;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 70%,#fff));-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:6px;letter-spacing:-.03em}
.ch-disc-lbl{font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:var(--t3);font-weight:700}
.ch-code-box{background:#0a0d14;border:1px solid color-mix(in srgb,var(--c) 30%,var(--b1));border-radius:14px;padding:18px 22px;text-align:center;min-width:240px}
.ch-code-lbl{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--t3);font-weight:700;margin-bottom:6px}
.ch-code{font-family:'JetBrains Mono',Consolas,monospace;font-size:24px;font-weight:800;color:var(--c);letter-spacing:2px;margin-bottom:12px}
.ch-cta{display:block;padding:13px 20px;border-radius:11px;background:linear-gradient(90deg,#c8941a,var(--gold),#f5d060,var(--gold),#c8941a);background-size:200% 100%;animation:shimmer 3s ease infinite;color:#0d141c;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:.2px;box-shadow:0 8px 22px rgba(240,180,41,.22);transition:transform .15s}
.ch-cta:hover{transform:translateY(-2px)}
.fp-sec{margin:52px 0 20px;text-align:center}
.fp-sec-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2.5px;color:var(--gold);font-weight:700;margin-bottom:10px}
.fp-sec-h2{font-size:clamp(21px,3.5vw,29px);font-weight:800;letter-spacing:-.015em}
.fp-sec-sub{color:var(--t3);font-size:13px;margin-top:6px}
.tp-row{display:flex;align-items:center;gap:14px;padding:16px 22px;background:var(--card2);border:1px solid var(--b1);border-radius:14px;margin:22px 0;justify-content:center;flex-wrap:wrap}
.tp-stars{font-size:20px;color:#00b67a;letter-spacing:1.5px;direction:ltr}
.tp-score{font-size:26px;font-weight:800;color:var(--t1)}
.tp-meta{font-size:12px;color:var(--t3)}
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
.plan{background:var(--card);border:1px solid var(--b1);border-radius:14px;padding:22px 18px;text-align:center;transition:transform .2s,border-color .2s;position:relative}
.plan:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--c) 40%,var(--b1))}
.plan-size{font-size:14px;font-weight:800;color:var(--t1);letter-spacing:.4px;margin-bottom:8px}
.plan-pct{position:absolute;top:-10px;inset-inline-end:14px;background:var(--c);color:#0d141c;font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px;letter-spacing:.6px;text-transform:uppercase}
.plan-prices{margin:14px 0 8px}
.plan-orig{font-size:13px;color:var(--t3);text-decoration:line-through;margin-bottom:2px}
.plan-final{font-size:26px;font-weight:900;color:var(--c);letter-spacing:-.02em}
.plan-save{font-size:11px;color:var(--green);margin-bottom:14px}
.plan-cta{display:block;padding:11px 14px;border-radius:9px;background:color-mix(in srgb,var(--c) 14%,transparent);border:1px solid color-mix(in srgb,var(--c) 36%,transparent);color:var(--c);font-weight:700;font-size:12px;text-decoration:none;letter-spacing:.3px;transition:all .2s}
.plan-cta:hover{background:var(--c);color:#0d141c}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}}
.stat{background:var(--card);border:1px solid var(--b1);border-radius:11px;padding:14px 12px;text-align:center;min-height:86px;display:flex;flex-direction:column;justify-content:center}
.stat-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--t3);font-weight:700;margin-bottom:6px}
.stat-val{font-size:14px;font-weight:700;color:var(--t1);line-height:1.25}
.stat.win .stat-val{color:var(--green)}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
@media(max-width:760px){.duo{grid-template-columns:1fr}}
.duo-card{background:var(--card);border:1px solid var(--b1);border-radius:14px;padding:22px;position:relative;overflow:hidden}
.duo-card.perks{border-color:color-mix(in srgb,var(--green) 22%,var(--b1))}
.duo-card.proibido{border-color:color-mix(in srgb,var(--red) 22%,var(--b1))}
.duo-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.duo-card.perks::before{background:linear-gradient(90deg,transparent,var(--green),transparent)}
.duo-card.proibido::before{background:linear-gradient(90deg,transparent,var(--red),transparent)}
.duo-h{font-size:14px;font-weight:800;color:var(--t1);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.duo-card.perks .duo-h::before{content:'✓';color:var(--green);font-size:18px;font-weight:900}
.duo-card.proibido .duo-h::before{content:'✗';color:var(--red);font-size:18px;font-weight:900}
.check-list,.x-list{list-style:none;padding:0}
.check-list li,.x-list li{padding:7px 0;color:var(--t2);font-size:13px;display:flex;gap:10px;align-items:flex-start}
.check-list li::before{content:'✓';color:var(--green);font-weight:800;flex-shrink:0;margin-top:1px}
.x-list li::before{content:'✗';color:var(--red);font-weight:800;flex-shrink:0;margin-top:1px}
.plats-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px}
.plat-pill{font-size:12px;font-weight:600;padding:6px 14px;border-radius:99px;background:var(--card2);color:var(--t2);border:1px solid var(--b1)}
.faqs{display:flex;flex-direction:column;gap:10px;margin-top:22px}
.faq{background:var(--card);border:1px solid var(--b1);border-radius:12px;padding:18px 20px}
.faq-q{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:8px}
.faq-q::before{content:'?';display:inline-block;width:20px;height:20px;background:var(--gold);color:#0d141c;border-radius:50%;text-align:center;font-size:12px;line-height:20px;margin-inline-end:8px;font-weight:900}
.faq-a{font-size:13px;color:var(--t2);line-height:1.65}
.faq-a strong{color:var(--c)}
.others{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:22px}
.other-card{background:var(--card);border:1px solid var(--b1);border-radius:12px;padding:18px 14px;text-align:center;text-decoration:none;color:inherit;transition:transform .2s,border-color .2s}
.other-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 40%,var(--b1))}
.other-card img{width:48px;height:48px;border-radius:10px;margin:0 auto 10px;background:#0a0d14;padding:6px}
.other-name{font-size:13px;font-weight:700;color:var(--t1);margin-bottom:4px}
.other-disc{font-size:11px;color:var(--c);font-weight:700}
.cmp-links{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px}
.cmp-link{font-size:13px;color:var(--t2);background:var(--card2);border:1px solid var(--b1);border-radius:99px;padding:8px 16px;text-decoration:none;transition:all .2s}
.cmp-link:hover{color:var(--gold);border-color:color-mix(in srgb,var(--gold) 40%,var(--b1))}
.bottom-cta{margin-top:48px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 14%,var(--card)),var(--card));border:1px solid color-mix(in srgb,var(--c) 30%,transparent);border-radius:18px;padding:36px 28px;text-align:center}
.bottom-cta h3{font-size:24px;font-weight:800;margin-bottom:10px;letter-spacing:-.01em}
.bottom-cta p{font-size:14px;color:var(--t3);margin-bottom:22px;max-width:520px;margin-inline:auto}
.bottom-cta .ch-cta{display:inline-block}
.fp-foot{margin-top:52px;padding:32px 20px 44px;border-top:1px solid var(--b1);background:var(--sur)}
.fp-foot-in{max-width:1100px;margin:0 auto;text-align:center}
.fp-foot-legal{font-size:12px;color:var(--t3);line-height:1.7;max-width:720px;margin:0 auto 14px}
.fp-foot-links{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-bottom:14px}
.fp-foot-links a{font-size:13px;color:var(--t2);text-decoration:none}
.fp-foot-links a:hover{color:var(--gold)}
.fp-foot-copy{font-size:12px;color:var(--t3)}
.fp-foot-copy span{color:#ff8c00;font-weight:700}
</style>
</head>
<body>
<nav class="fp-nav">
  <a class="fp-nav-logo" href="${lang === 'en' ? '/' : '/' + lang + '/'}">Markets <span>Coupons</span></a>
  <div class="fp-nav-right">
    <a class="fp-nav-back" href="${lang === 'en' ? '/' : '/' + lang + '/'}">${rtl ? '→' : '←'} ${esc(t.back)}</a>
    <details class="fp-lang">
      <summary>${LANG_NAME[lang]}</summary>
      <div class="fp-lang-menu">${langSwitch}</div>
    </details>
  </div>
</nav>
<div class="fp-wrap">
  <header class="fp-hero">
    <div class="fp-hero-bg"></div>
    <div class="fp-hero-grid">
      ${f.icon_url ? `<img class="fp-hero-logo" src="${esc(imgUrl(f.icon_url))}" alt="${esc(f.name)} logo" width="110" height="110">` : ''}
      <div>
        <div class="fp-hero-eyebrow">${esc(locType(f.type, lang))}${f.discount ? ` · ${f.discount}% ${esc(t.off)}` : ''}</div>
        <h1 class="fp-h1">${esc(f.name)} <span class="accent">${f.discount ? f.discount + '% ' + esc(t.off) : esc(t.exclCoupon)}</span></h1>
        <p class="fp-hero-desc">${esc(desc)}</p>
      </div>
    </div>
  </header>

  ${(hasCoupon || f.discount) ? `
  <section class="coupon-highlight">
    <div>
      <div class="ch-disc">${f.discount ? f.discount + '%' : esc(t.off)}</div>
      <div class="ch-disc-lbl">${esc(t.discLbl)}${minP ? ' · ' + esc(t.from) + ' $' + minP.toFixed(2) : ''}</div>
    </div>
    <div class="ch-code-box">
      <div class="ch-code-lbl">${hasCoupon ? esc(t.officialCoupon) : esc(t.noCode)}</div>
      <div class="ch-code">${hasCoupon ? esc(f.coupon) : '—'}</div>
      <a class="ch-cta" href="${esc(f.link || '#')}" target="_blank" rel="noopener sponsored">${esc(t.activate)} →</a>
    </div>
  </section>` : ''}

  ${tpScore ? `<div class="tp-row"><span class="tp-stars">${stars(tpScore)}</span><span class="tp-score">${tpScore}</span><span class="tp-meta">${reviewsStr ? reviewsStr + ' ' + esc(t.reviews) : 'Trustpilot'}</span></div>` : ''}

  ${plansHtml ? `
  <section class="fp-sec">
    <div class="fp-sec-eyebrow">${esc(t.plansEye)}</div>
    <h2 class="fp-sec-h2">${esc(t.plansH2)}</h2>
    <p class="fp-sec-sub">${esc(t.plansSubApplied)} <strong style="color:var(--c)">${esc(f.coupon || t.couponApplied)}</strong> · ${esc(t.plansSubUpdated)} ${esc(dateStr)}</p>
  </section>
  <div class="plans">${plansHtml}</div>` : ''}

  <section class="fp-sec">
    <div class="fp-sec-eyebrow">${esc(t.rulesEye)}</div>
    <h2 class="fp-sec-h2">${esc(t.rulesH2)}</h2>
  </section>
  <div class="stats">${stats.map(s => `<div class="stat ${s.win ? 'win' : ''}"><div class="stat-lbl">${esc(s.lbl)}</div><div class="stat-val">${esc(s.val)}</div></div>`).join('')}</div>
  ${platformsHtml ? `<div class="plats-row">${platformsHtml}</div>` : ''}

  ${(perksHtml || proibidoHtml) ? `
  <section class="fp-sec">
    <div class="fp-sec-eyebrow">${esc(t.perksEye)}</div>
    <h2 class="fp-sec-h2">${esc(t.perksH2)}</h2>
  </section>
  <div class="duo">
    ${perksHtml ? `<div class="duo-card perks"><div class="duo-h">${esc(t.allowed)}</div>${perksHtml}</div>` : ''}
    ${proibidoHtml ? `<div class="duo-card proibido"><div class="duo-h">${esc(t.prohibited)}</div>${proibidoHtml}</div>` : ''}
  </div>` : ''}

  <section class="fp-sec">
    <div class="fp-sec-eyebrow">${esc(t.faqEye)}</div>
    <h2 class="fp-sec-h2">${esc(t.faqH2)}</h2>
  </section>
  <div class="faqs">${faqs.map(q => `<div class="faq"><div class="faq-q">${esc(q.q)}</div><div class="faq-a">${q.a}</div></div>`).join('')}</div>

  ${compareLinks ? `
  <section class="fp-sec">
    <div class="fp-sec-eyebrow">${esc(t.compareEye)}</div>
    <h2 class="fp-sec-h2">${esc(fill(t.compareH2))}</h2>
  </section>
  <div class="cmp-links">${compareLinks}</div>` : ''}

  ${othersHtml ? `
  <section class="fp-sec">
    <div class="fp-sec-eyebrow">${esc(t.othersEye)}</div>
    <h2 class="fp-sec-h2">${esc(t.othersH2)}</h2>
  </section>
  <div class="others">${othersHtml}</div>` : ''}

  <div class="bottom-cta">
    <h3>${esc(fill(t.ctaH3))}</h3>
    <p>${hasCoupon ? `${esc(t.activateCoupon)}: <strong style="color:var(--c)">${esc(f.coupon)}</strong>` : esc(desc)}</p>
    <a class="ch-cta" href="${esc(f.link || '#')}" target="_blank" rel="noopener sponsored">${esc(fill(t.ctaBuy))} →</a>
  </div>
</div>

<footer class="fp-foot">
  <div class="fp-foot-in">
    <div class="fp-foot-links">
      <a href="${lang === 'en' ? '/' : '/' + lang + '/'}">Home</a>
      <a href="${langHref(lang, 'coupons')}">Coupons</a>
      <a href="${langHref(lang, 'firms')}">Prop Firms</a>
      <a href="${langHref(lang, 'blog')}">Blog</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </div>
    <p class="fp-foot-legal">${esc(t.footLegal)}</p>
    <p class="fp-foot-copy">© ${new Date().getFullYear()} Markets <span>Coupons</span>. ${esc(t.footRights)}</p>
  </div>
</footer>
</body>
</html>`;
}

async function main() {
  const firms = await loadFirms();
  if (!firms.length) { console.error('Sem firmas.'); process.exit(1); }

  if (PREVIEW) {
    const f = firms.find(x => x.id === PREVIEW);
    if (!f) { console.error(`Firma "${PREVIEW}" nao encontrada`); process.exit(1); }
    const dir = path.join(ROOT, 'firm-preview');
    fs.mkdirSync(dir, { recursive: true });
    for (const lang of LANGS) {
      const html = genPage(f, firms, lang);
      fs.writeFileSync(path.join(dir, `${f.id}-${lang}.html`), html);
      console.log(`  ok firm-preview/${f.id}-${lang}.html (${(html.length / 1024).toFixed(1)}kb)`);
    }
    console.log(`\nPREVIEW: ${LANGS.length} arquivos. URLs: https://www.marketscoupons.com/firm-preview/${f.id}-<lang>.html`);
    return;
  }

  // FINAL: firms/{id}.html (en) + {lang}/firms/{id}.html
  let n = 0;
  for (const f of firms) {
    if (!ROUTE_IDS.has(f.id)) continue;
    for (const lang of LANGS) {
      const html = genPage(f, firms, lang);
      const dir = lang === 'en' ? path.join(ROOT, 'seo') : path.join(ROOT, lang, 'seo');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${f.id}.html`), html);
      n++;
    }
    console.log(`  ok ${f.id} (${LANGS.length} langs)`);
  }
  console.log(`\nGerados: ${n} arquivos (${LANGS.length} langs x firmas).`);
}
main().catch(e => { console.error(e); process.exit(1); });
