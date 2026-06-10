// Injeta key reviews_not_subscribed + atualiza reviews_form_consent em 8 langs.
import fs from 'node:fs';
const PATH = 'volumefilter-i18n.js';

const T = {
  pt: {
    reviews_not_subscribed: 'Pra avaliar você precisa primeiro baixar o indicador. Cadastra seu email no formulário lá em cima e volta aqui.',
    reviews_form_consent: 'Use o mesmo email que você usou pra baixar o indicador. Só quem baixou pode avaliar (anti-spam).',
    reviews_form_title: 'Já baixou? Deixe sua avaliação.',
  },
  en: {
    reviews_not_subscribed: 'To review you first need to download the indicator. Sign up with your email at the top of the page and come back here.',
    reviews_form_consent: 'Use the same email you used to download the indicator. Only downloaders can review (anti-spam).',
    reviews_form_title: 'Downloaded already? Leave your review.',
  },
  es: {
    reviews_not_subscribed: 'Para reseñar primero necesitas descargar el indicador. Regístrate con tu email arriba en la página y vuelve aquí.',
    reviews_form_consent: 'Usa el mismo email con el que descargaste el indicador. Solo quien descargó puede reseñar (anti-spam).',
    reviews_form_title: '¿Ya lo descargaste? Deja tu reseña.',
  },
  it: {
    reviews_not_subscribed: 'Per recensire devi prima scaricare l\'indicatore. Registrati con la tua email in alto nella pagina e torna qui.',
    reviews_form_consent: 'Usa la stessa email con cui hai scaricato l\'indicatore. Solo chi ha scaricato può recensire (anti-spam).',
    reviews_form_title: 'Già scaricato? Lascia la tua recensione.',
  },
  fr: {
    reviews_not_subscribed: 'Pour laisser un avis vous devez d\'abord télécharger l\'indicateur. Inscrivez-vous avec votre email en haut de la page et revenez ici.',
    reviews_form_consent: 'Utilisez le même email que pour télécharger l\'indicateur. Seuls les téléchargeurs peuvent laisser un avis (anti-spam).',
    reviews_form_title: 'Déjà téléchargé ? Laissez votre avis.',
  },
  de: {
    reviews_not_subscribed: 'Um zu bewerten, müssen Sie zuerst den Indikator herunterladen. Melden Sie sich mit Ihrer E-Mail oben auf der Seite an und kommen Sie zurück.',
    reviews_form_consent: 'Verwenden Sie dieselbe E-Mail, mit der Sie den Indikator heruntergeladen haben. Nur Downloader können bewerten (Anti-Spam).',
    reviews_form_title: 'Schon heruntergeladen? Hinterlassen Sie Ihre Bewertung.',
  },
  ar: {
    reviews_not_subscribed: 'للمراجعة، يجب عليك أولاً تنزيل المؤشر. سجل بريدك الإلكتروني في أعلى الصفحة وعد إلى هنا.',
    reviews_form_consent: 'استخدم نفس البريد الإلكتروني الذي استخدمته لتنزيل المؤشر. فقط من قام بالتنزيل يمكنه المراجعة (مكافحة البريد العشوائي).',
    reviews_form_title: 'هل قمت بالتنزيل بالفعل؟ اترك مراجعتك.',
  },
  id: {
    reviews_not_subscribed: 'Untuk mereview Anda harus mengunduh indikator terlebih dahulu. Daftar dengan email Anda di atas halaman dan kembali ke sini.',
    reviews_form_consent: 'Gunakan email yang sama dengan yang Anda gunakan untuk mengunduh indikator. Hanya yang sudah mengunduh yang bisa mereview (anti-spam).',
    reviews_form_title: 'Sudah mengunduh? Tinggalkan review Anda.',
  },
};

let s = fs.readFileSync(PATH, 'utf8');
for (const [lang, kv] of Object.entries(T)) {
  const startRe = new RegExp(`(\\b${lang}\\s*:\\s*\\{)`, 'm');
  const m = startRe.exec(s);
  if (!m) { console.warn(`SKIP ${lang}`); continue; }
  const start = m.index + m[0].length;
  let depth = 1, i = start;
  while (i < s.length && depth > 0) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') depth--;
    if (depth === 0) break;
    i++;
  }
  let block = s.slice(start, i);

  // 1) UPDATE existentes
  for (const [k, v] of Object.entries(kv)) {
    const re = new RegExp(`(\\b${k}\\s*:\\s*)(?:'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*"|\`(?:\\\\.|[^\`\\\\])*\`)`, 'm');
    if (re.test(block)) block = block.replace(re, `$1${JSON.stringify(v)}`);
    else {
      // 2) INSERT se não existir
      block = block.replace(/,\s*$/, '') + `,\n    ${k}: ${JSON.stringify(v)},\n  `;
    }
  }
  s = s.slice(0, start) + block + s.slice(i);
  console.log(`${lang}: updated ${Object.keys(kv).length}`);
}
fs.writeFileSync(PATH, s, 'utf8');
console.log('Done.');
