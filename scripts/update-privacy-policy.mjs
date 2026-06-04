// Atualiza priv_body nos 7 i18n split files adicionando 4 ajustes alinhados ao PropFirmMatch.
// Ajustes:
//  A) "O que NAO coletamos" + session analytics (Sentry)
//  B) Transfer disclosure EEA/UK em Meta/Google
//  C) Consent records com timestamps + 3 formas de revogar
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const langs = ['pt','en','es','fr','it','de','ar'];

// ============ CONTEUDO DOS 4 AJUSTES POR IDIOMA ============
const T = {
  pt: {
    notCollected: `<p><strong>O que NÃO coletamos:</strong> Não coletamos intencionalmente números de cartão de crédito completos, senhas em texto plano, documentos oficiais com foto ou outros dados de autenticação altamente sensíveis. Pagamentos são processados pelas firmas parceiras (Apex, Bulenox, FTMO, etc) e nunca passam pelos nossos servidores.</p><p><strong>Analytics de sessão e detecção de erros:</strong> Usamos Sentry para monitoramento de erros técnicos. Essas ferramentas podem capturar eventos do navegador, logs de console, dispositivo e sistema operacional. Não fazemos session replay completo nem capturamos conteúdo de formulários ou senhas.</p>`,
    transferEEA: ` <strong>Para usuários no Espaço Econômico Europeu (EEE), Reino Unido ou Suíça:</strong> o compartilhamento de dados comportamentais com Meta e Google constitui uma transferência de dados pessoais para controladores terceiros para fins de publicidade direcionada. Você pode retirar o consentimento a qualquer momento por email em <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a> ou via configurações de cookies.`,
    consentRecords: `<h2>15.1 Registros de consentimento</h2><p>Registramos as decisões de consentimento com timestamps (data e hora) para demonstrar conformidade com GDPR, CCPA e LGPD. Você pode retirar ou alterar seu consentimento a qualquer momento por: (1) clicando em "Preferências" no banner de cookies; (2) acessando as configurações da sua conta; ou (3) enviando email para <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a>. Retirar o consentimento não afeta a legalidade do processamento feito antes da retirada.</p>`
  },
  en: {
    notCollected: `<p><strong>What we do NOT collect:</strong> We do not intentionally collect full payment card numbers, plain-text passwords, government-issued photo IDs, or other highly sensitive authentication data. Payments are processed by partner firms (Apex, Bulenox, FTMO, etc.) and never reach our servers.</p><p><strong>Session analytics and error detection:</strong> We use Sentry for technical error monitoring. These tools may capture browser events, console logs, device and operating system information. We do not record full session replays and do not capture form content or passwords.</p>`,
    transferEEA: ` <strong>For users in the European Economic Area (EEA), United Kingdom, or Switzerland:</strong> sharing behavioral data with Meta and Google constitutes a transfer of personal data to third-party controllers for targeted advertising purposes. You may withdraw consent at any time by emailing <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a> or via cookie settings.`,
    consentRecords: `<h2>15.1 Consent records</h2><p>We record consent decisions with timestamps (date and time) to demonstrate compliance with GDPR, CCPA and LGPD. You may withdraw or change your consent at any time by: (1) clicking "Preferences" on the cookie banner; (2) accessing your account settings; or (3) emailing <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a>. Withdrawing consent does not affect the legality of processing carried out before withdrawal.</p>`
  },
  es: {
    notCollected: `<p><strong>Lo que NO recopilamos:</strong> No recopilamos intencionalmente números de tarjeta de crédito completos, contraseñas en texto plano, documentos oficiales con foto ni otros datos de autenticación altamente sensibles. Los pagos los procesan las firmas asociadas (Apex, Bulenox, FTMO, etc.) y nunca pasan por nuestros servidores.</p><p><strong>Analítica de sesión y detección de errores:</strong> Usamos Sentry para el monitoreo técnico de errores. Estas herramientas pueden capturar eventos del navegador, registros de consola, dispositivo y sistema operativo. No realizamos repetición de sesión completa ni capturamos contenido de formularios ni contraseñas.</p>`,
    transferEEA: ` <strong>Para usuarios en el Espacio Económico Europeo (EEE), Reino Unido o Suiza:</strong> el intercambio de datos de comportamiento con Meta y Google constituye una transferencia de datos personales a controladores terceros con fines de publicidad dirigida. Puedes retirar el consentimiento en cualquier momento enviando un correo a <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a> o mediante la configuración de cookies.`,
    consentRecords: `<h2>15.1 Registros de consentimiento</h2><p>Registramos las decisiones de consentimiento con marcas de tiempo (fecha y hora) para demostrar conformidad con GDPR, CCPA y LGPD. Puedes retirar o cambiar tu consentimiento en cualquier momento mediante: (1) haciendo clic en "Preferencias" en el banner de cookies; (2) accediendo a la configuración de tu cuenta; o (3) enviando un correo a <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a>. Retirar el consentimiento no afecta la legalidad del procesamiento realizado antes de la retirada.</p>`
  },
  fr: {
    notCollected: `<p><strong>Ce que nous ne collectons PAS :</strong> Nous ne collectons pas intentionnellement de numéros de carte bancaire complets, mots de passe en clair, pièces d'identité officielles avec photo, ni autres données d'authentification hautement sensibles. Les paiements sont traités par les firmes partenaires (Apex, Bulenox, FTMO, etc.) et ne passent jamais par nos serveurs.</p><p><strong>Analyse de session et détection d'erreurs :</strong> Nous utilisons Sentry pour la surveillance technique des erreurs. Ces outils peuvent capturer des événements du navigateur, des journaux de console, des informations sur l'appareil et le système d'exploitation. Nous n'enregistrons pas de rejeu complet de session et ne capturons pas le contenu des formulaires ni les mots de passe.</p>`,
    transferEEA: ` <strong>Pour les utilisateurs de l'Espace économique européen (EEE), du Royaume-Uni ou de la Suisse :</strong> le partage de données comportementales avec Meta et Google constitue un transfert de données personnelles à des contrôleurs tiers à des fins de publicité ciblée. Vous pouvez retirer votre consentement à tout moment en envoyant un e-mail à <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a> ou via les paramètres des cookies.`,
    consentRecords: `<h2>15.1 Enregistrements de consentement</h2><p>Nous enregistrons les décisions de consentement avec horodatage (date et heure) pour démontrer la conformité au RGPD, CCPA et LGPD. Vous pouvez retirer ou modifier votre consentement à tout moment via : (1) en cliquant sur "Préférences" dans la bannière de cookies ; (2) en accédant aux paramètres de votre compte ; ou (3) en envoyant un e-mail à <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a>. Le retrait du consentement n'affecte pas la légalité du traitement effectué avant le retrait.</p>`
  },
  it: {
    notCollected: `<p><strong>Cosa NON raccogliamo:</strong> Non raccogliamo intenzionalmente numeri di carta di credito completi, password in chiaro, documenti ufficiali con foto né altri dati di autenticazione altamente sensibili. I pagamenti vengono gestiti dalle firme partner (Apex, Bulenox, FTMO, ecc.) e non passano mai dai nostri server.</p><p><strong>Analisi di sessione e rilevamento errori:</strong> Utilizziamo Sentry per il monitoraggio tecnico degli errori. Questi strumenti possono catturare eventi del browser, log della console, informazioni sul dispositivo e sistema operativo. Non registriamo session replay completi né catturiamo contenuti dei moduli o password.</p>`,
    transferEEA: ` <strong>Per gli utenti dello Spazio Economico Europeo (SEE), Regno Unito o Svizzera:</strong> la condivisione di dati comportamentali con Meta e Google costituisce un trasferimento di dati personali a controllori terzi a fini di pubblicità mirata. Puoi revocare il consenso in qualsiasi momento inviando un'email a <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a> o tramite le impostazioni dei cookie.`,
    consentRecords: `<h2>15.1 Registri di consenso</h2><p>Registriamo le decisioni di consenso con marche temporali (data e ora) per dimostrare la conformità a GDPR, CCPA e LGPD. Puoi revocare o modificare il tuo consenso in qualsiasi momento tramite: (1) il pulsante "Preferenze" nel banner dei cookie; (2) le impostazioni del tuo account; o (3) inviando un'email a <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a>. La revoca del consenso non incide sulla liceità del trattamento effettuato prima della revoca.</p>`
  },
  de: {
    notCollected: `<p><strong>Was wir NICHT erfassen:</strong> Wir erfassen nicht absichtlich vollständige Kreditkartennummern, Klartextpasswörter, amtliche Lichtbildausweise oder andere hochsensible Authentifizierungsdaten. Zahlungen werden von Partner-Firmen (Apex, Bulenox, FTMO usw.) verarbeitet und gelangen nie auf unsere Server.</p><p><strong>Sitzungsanalyse und Fehlererkennung:</strong> Wir nutzen Sentry zur technischen Fehlerüberwachung. Diese Tools können Browser-Ereignisse, Konsolen-Logs, Geräte- und Betriebssysteminformationen erfassen. Wir zeichnen keine vollständigen Session-Replays auf und erfassen keine Formularinhalte oder Passwörter.</p>`,
    transferEEA: ` <strong>Für Nutzer im Europäischen Wirtschaftsraum (EWR), Vereinigten Königreich oder der Schweiz:</strong> die Weitergabe von Verhaltensdaten an Meta und Google stellt eine Übermittlung personenbezogener Daten an Drittverantwortliche zu Zwecken zielgerichteter Werbung dar. Sie können Ihre Einwilligung jederzeit per E-Mail an <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a> oder über die Cookie-Einstellungen widerrufen.`,
    consentRecords: `<h2>15.1 Einwilligungsprotokolle</h2><p>Wir protokollieren Einwilligungsentscheidungen mit Zeitstempeln (Datum und Uhrzeit), um die Einhaltung von DSGVO, CCPA und LGPD nachzuweisen. Sie können Ihre Einwilligung jederzeit widerrufen oder ändern durch: (1) Klick auf "Einstellungen" im Cookie-Banner; (2) Zugriff auf Ihre Kontoeinstellungen; oder (3) E-Mail an <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a>. Der Widerruf der Einwilligung berührt nicht die Rechtmäßigkeit der vor dem Widerruf erfolgten Verarbeitung.</p>`
  },
  ar: {
    notCollected: `<p><strong>ما لا نجمعه:</strong> لا نجمع عمداً أرقام بطاقات الائتمان الكاملة، أو كلمات المرور النصية، أو وثائق الهوية الرسمية المصورة، أو غيرها من بيانات المصادقة الحساسة للغاية. تتم معالجة المدفوعات بواسطة الشركات الشريكة (Apex، Bulenox، FTMO، إلخ) ولا تمر أبداً عبر خوادمنا.</p><p><strong>تحليلات الجلسة واكتشاف الأخطاء:</strong> نستخدم Sentry للمراقبة التقنية للأخطاء. قد تلتقط هذه الأدوات أحداث المتصفح وسجلات وحدة التحكم ومعلومات الجهاز ونظام التشغيل. لا نسجل إعادة تشغيل الجلسة الكاملة ولا نلتقط محتوى النماذج أو كلمات المرور.</p>`,
    transferEEA: ` <strong>للمستخدمين في المنطقة الاقتصادية الأوروبية (EEA) أو المملكة المتحدة أو سويسرا:</strong> تشكل مشاركة البيانات السلوكية مع Meta و Google نقل بيانات شخصية إلى مراقبين من أطراف ثالثة لأغراض الإعلانات المستهدفة. يمكنك سحب الموافقة في أي وقت بإرسال بريد إلكتروني إلى <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a> أو عبر إعدادات ملفات تعريف الارتباط.`,
    consentRecords: `<h2>15.1 سجلات الموافقة</h2><p>نسجل قرارات الموافقة مع طوابع زمنية (التاريخ والوقت) لإثبات الامتثال لـ GDPR و CCPA و LGPD. يمكنك سحب أو تغيير موافقتك في أي وقت عبر: (1) النقر على "التفضيلات" في شريط ملفات تعريف الارتباط؛ (2) الوصول إلى إعدادات حسابك؛ أو (3) إرسال بريد إلكتروني إلى <a href="mailto:privacy@marketscoupons.com">privacy@marketscoupons.com</a>. سحب الموافقة لا يؤثر على شرعية المعالجة التي تمت قبل السحب.</p>`
  }
};

// =========================== PATCH ===========================
let changed = 0;
for (const lang of langs) {
  const file = path.join(ROOT, `i18n-${lang}.js`);
  if (!fs.existsSync(file)) { console.warn(`skip: ${file} not found`); continue; }
  let src = fs.readFileSync(file, 'utf8');
  // extrai priv_body
  const m = src.match(/("priv_body":")((?:[^"\\]|\\.)*)(")/);
  if (!m) { console.warn(`skip: ${lang} no priv_body`); continue; }
  const before = m[1];
  const oldEnc = m[2];
  const after = m[3];
  // decode
  const oldDecoded = JSON.parse('"' + oldEnc + '"');
  const t = T[lang];

  let p = oldDecoded;
  // 1) Insere "O que NÃO coletamos" + "Session analytics" ANTES de "4. Purpose" / "4. Finalidade" / etc.
  //    Estratégia segura: inserir antes do primeiro `<h2>4` ou `<h2>4 ` ou `<h2>4.` no doc.
  p = p.replace(/(<h2>4\.)/, t.notCollected + '$1');

  // 2) Adicionar transfer disclosure EEA/UK na seção "Data sharing" (procura "Vercel (hosting)" como ancora confiavel)
  p = p.replace(/(Vercel \(hosting\))/i, '$1.' + t.transferEEA + ' ');

  // 3) Adicionar "Consent records" depois de "<h2>16" (antes de "Changes" / "Mudancas")
  p = p.replace(/(<h2>16\.)/, t.consentRecords + '$1');

  // re-encode pra JSON-string
  const newEnc = JSON.stringify(p).slice(1, -1); // remove aspas externas

  if (newEnc === oldEnc) { console.log(`${lang}: no change (already updated?)`); continue; }
  const newSrc = src.replace(before + oldEnc + after, before + newEnc + after);
  fs.writeFileSync(file, newSrc);
  console.log(`${lang}: updated (${oldEnc.length} → ${newEnc.length} chars)`);
  changed++;
}
console.log(`\nTotal files changed: ${changed}/${langs.length}`);
