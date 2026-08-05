/* ─────────────────────────────────────────────────────────────────────────────
 * IDIOMAS DO SITE NOVO
 *
 * POR QUE EXISTE: a casca que o Claude Design entregou tem um seletor de idioma
 * DECORATIVO , trocava o selo de EN pra PT e não traduzia nada. O site atual tem
 * 8 idiomas há meses; o novo ia pro ar monolíngue, com 75% do tráfego vindo da
 * Índia e boa parte do Brasil.
 *
 * ⚠️ POR QUE MORA NA RAIZ E NÃO EM novo/: o desempacotador APAGA a pasta novo/
 * inteira a cada entrega do Design. Deixei este arquivo lá na primeira tentativa
 * e ele sumiu no rebuild seguinte , 404 no ar. Mesmo erro que já tinha custado as
 * logos das firmas. Na raiz, o desempacotador não alcança.
 *
 * COMO FUNCIONA: dicionário chaveado pelo texto EM INGLÊS exatamente como aparece
 * na tela. O tradutor roda sobre os NÓS DE TEXTO depois de cada renderização do
 * runtime do Design , sem chave inventada, sem tocar na marcação.
 *
 * ⚠️ NUNCA SE TRADUZ (regra do projeto): nome de firma, cupom, preço, ticker,
 * plataforma, e os termos "Prop Firm", "Profit Split", "Drawdown", "Lifetime".
 * Por isso é ALLOWLIST: o que não está aqui fica em inglês, que é o padrão do site.
 *
 * Traduzido por mim, à mão , nunca por Gemini/API (lei do projeto).
 * ────────────────────────────────────────────────────────────────────────────── */
window.MC_I18N_NOVO = {
  /* navegação e cabeçalho */
  'Log in':            { pt:'Entrar', es:'Iniciar sesión', it:'Accedi', fr:'Connexion', de:'Anmelden', ar:'تسجيل الدخول', id:'Masuk' },
  'Sign up':           { pt:'Criar conta', es:'Registrarse', it:'Registrati', fr:'S’inscrire', de:'Registrieren', ar:'إنشاء حساب', id:'Daftar' },
  'Specials':          { pt:'Ofertas', es:'Ofertas', it:'Offerte', fr:'Offres', de:'Angebote', ar:'العروض', id:'Penawaran' },
  'Firms':             { pt:'Firmas', es:'Firmas', it:'Società', fr:'Sociétés', de:'Firmen', ar:'الشركات', id:'Perusahaan' },
  'Platforms':         { pt:'Plataformas', es:'Plataformas', it:'Piattaforme', fr:'Plateformes', de:'Plattformen', ar:'المنصات', id:'Platform' },
  'Indicators':        { pt:'Indicadores', es:'Indicadores', it:'Indicatori', fr:'Indicateurs', de:'Indikatoren', ar:'المؤشرات', id:'Indikator' },
  'Compare':           { pt:'Comparar', es:'Comparar', it:'Confronta', fr:'Comparer', de:'Vergleichen', ar:'قارن', id:'Bandingkan' },
  'Economic Calendar': { pt:'Calendário econômico', es:'Calendario económico', it:'Calendario economico', fr:'Calendrier économique', de:'Wirtschaftskalender', ar:'التقويم الاقتصادي', id:'Kalender Ekonomi' },
  'Heat Map':          { pt:'Mapa de calor', es:'Mapa de calor', it:'Mappa di calore', fr:'Carte thermique', de:'Heatmap', ar:'خريطة حرارية', id:'Peta Panas' },
  'Daily Analysis':    { pt:'Análise diária', es:'Análisis diario', it:'Analisi giornaliera', fr:'Analyse quotidienne', de:'Tagesanalyse', ar:'التحليل اليومي', id:'Analisis Harian' },
  'Guides':            { pt:'Guias', es:'Guías', it:'Guide', fr:'Guides', de:'Ratgeber', ar:'الأدلة', id:'Panduan' },
  'Position Size':     { pt:'Tamanho de posição', es:'Tamaño de posición', it:'Dimensione posizione', fr:'Taille de position', de:'Positionsgröße', ar:'حجم المركز', id:'Ukuran Posisi' },
  'Quiz':              { pt:'Quiz', es:'Quiz', it:'Quiz', fr:'Quiz', de:'Quiz', ar:'اختبار', id:'Kuis' },
  'Awards':            { pt:'Prêmios', es:'Premios', it:'Premi', fr:'Prix', de:'Auszeichnungen', ar:'الجوائز', id:'Penghargaan' },
  'Live Room':         { pt:'Sala ao vivo', es:'Sala en vivo', it:'Sala live', fr:'Salle live', de:'Live-Raum', ar:'الغرفة المباشرة', id:'Ruang Live' },

  /* hero */
  'VERIFIED · UPDATED DAILY': { pt:'VERIFICADO · ATUALIZADO TODO DIA', es:'VERIFICADO · ACTUALIZADO A DIARIO', it:'VERIFICATO · AGGIORNATO OGNI GIORNO', fr:'VÉRIFIÉ · MIS À JOUR CHAQUE JOUR', de:'GEPRÜFT · TÄGLICH AKTUALISIERT', ar:'مُتحقق · يُحدَّث يوميًا', id:'TERVERIFIKASI · DIPERBARUI HARIAN' },
  'Hunt the':      { pt:'Cace as', es:'Caza las', it:'Caccia le', fr:'Chassez les', de:'Jage die', ar:'اصطد', id:'Buru' },
  'biggest':       { pt:'maiores', es:'mayores', it:'migliori', fr:'meilleures', de:'größten', ar:'أكبر', id:'terbesar' },
  'trading deals': { pt:'ofertas de trading', es:'ofertas de trading', it:'offerte di trading', fr:'offres de trading', de:'Trading-Angebote', ar:'عروض التداول', id:'penawaran trading' },
  'Browse coupons': { pt:'Ver cupons', es:'Ver cupones', it:'Vedi coupon', fr:'Voir les coupons', de:'Coupons ansehen', ar:'تصفح الكوبونات', id:'Lihat Kupon' },
  'Compare firms':  { pt:'Comparar firmas', es:'Comparar firmas', it:'Confronta società', fr:'Comparer les sociétés', de:'Firmen vergleichen', ar:'قارن الشركات', id:'Bandingkan Perusahaan' },
  'Trading firms':  { pt:'Firmas de trading', es:'Firmas de trading', it:'Società di trading', fr:'Sociétés de trading', de:'Trading-Firmen', ar:'شركات التداول', id:'Perusahaan trading' },
  'Max discount':   { pt:'Desconto máximo', es:'Descuento máximo', it:'Sconto massimo', fr:'Remise maximale', de:'Maximaler Rabatt', ar:'أقصى خصم', id:'Diskon maksimum' },
  'Monthly views':  { pt:'Visitas por mês', es:'Visitas al mes', it:'Visite al mese', fr:'Vues par mois', de:'Aufrufe pro Monat', ar:'مشاهدات شهرية', id:'Kunjungan per bulan' },
  'Codes copied / mo': { pt:'Cupons copiados / mês', es:'Cupones copiados / mes', it:'Coupon copiati / mese', fr:'Codes copiés / mois', de:'Codes kopiert / Monat', ar:'أكواد منسوخة / شهر', id:'Kode disalin / bln' },
  'Languages':      { pt:'Idiomas', es:'Idiomas', it:'Lingue', fr:'Langues', de:'Sprachen', ar:'لغات', id:'Bahasa' },
  'Max off':        { pt:'Desconto máx.', es:'Descuento máx.', it:'Sconto max', fr:'Remise max', de:'Max. Rabatt', ar:'أقصى خصم', id:'Diskon maks' },
  'Copied/mo':      { pt:'Copiados/mês', es:'Copiados/mes', it:'Copiati/mese', fr:'Copiés/mois', de:'Kopiert/Monat', ar:'منسوخ/شهر', id:'Disalin/bln' },

  /* telegram */
  'Get Exclusive Coupons on Telegram': { pt:'Receba cupons exclusivos no Telegram', es:'Recibe cupones exclusivos en Telegram', it:'Ricevi coupon esclusivi su Telegram', fr:'Recevez des coupons exclusifs sur Telegram', de:'Exklusive Coupons auf Telegram', ar:'احصل على كوبونات حصرية على تيليجرام', id:'Dapatkan Kupon Eksklusif di Telegram' },
  "The codes we can't post publicly go here first": { pt:'Os códigos que não podemos publicar chegam lá primeiro', es:'Los códigos que no podemos publicar llegan allí primero', it:'I codici che non possiamo pubblicare arrivano prima lì', fr:'Les codes que nous ne pouvons pas publier arrivent là en premier', de:'Codes, die wir nicht öffentlich posten können, kommen zuerst dorthin', ar:'الأكواد التي لا يمكننا نشرها علنًا تصل هناك أولًا', id:'Kode yang tidak bisa kami posting publik masuk ke sana lebih dulu' },
  'Join free': { pt:'Entrar grátis', es:'Entrar gratis', it:'Entra gratis', fr:'Rejoindre gratuitement', de:'Kostenlos beitreten', ar:'انضم مجانًا', id:'Gabung gratis' },

  /* cards de firma */
  'Best deals right now': { pt:'Melhores ofertas agora', es:'Mejores ofertas ahora', it:'Migliori offerte ora', fr:'Meilleures offres du moment', de:'Beste Angebote jetzt', ar:'أفضل العروض الآن', id:'Penawaran terbaik saat ini' },
  'EXCLUSIVE COUPON': { pt:'CUPOM EXCLUSIVO', es:'CUPÓN EXCLUSIVO', it:'COUPON ESCLUSIVO', fr:'COUPON EXCLUSIF', de:'EXKLUSIVER COUPON', ar:'كوبون حصري', id:'KUPON EKSKLUSIF' },
  'Copy': { pt:'Copiar', es:'Copiar', it:'Copia', fr:'Copier', de:'Kopieren', ar:'نسخ', id:'Salin' },
  'Use the coupon at checkout': { pt:'Use o cupom no checkout', es:'Usa el cupón en el checkout', it:'Usa il coupon al checkout', fr:'Utilisez le coupon au paiement', de:'Coupon an der Kasse verwenden', ar:'استخدم الكوبون عند الدفع', id:'Gunakan kupon saat checkout' },
  'View plans': { pt:'Ver planos', es:'Ver planes', it:'Vedi piani', fr:'Voir les offres', de:'Pläne ansehen', ar:'عرض الخطط', id:'Lihat paket' },
  'Write a review': { pt:'Escrever avaliação', es:'Escribir reseña', it:'Scrivi una recensione', fr:'Écrire un avis', de:'Bewertung schreiben', ar:'اكتب مراجعة', id:'Tulis ulasan' },
  'Futures': { pt:'Futuros', es:'Futuros', it:'Futures', fr:'Futures', de:'Futures', ar:'العقود الآجلة', id:'Futures' },
  'Forex/Futures': { pt:'Forex/Futuros', es:'Forex/Futuros', it:'Forex/Futures', fr:'Forex/Futures', de:'Forex/Futures', ar:'فوركس/آجلة', id:'Forex/Futures' },
  'Static': { pt:'Estático', es:'Estático', it:'Statico', fr:'Statique', de:'Statisch', ar:'ثابت', id:'Statis' },
  'Fixed': { pt:'Fixo', es:'Fijo', it:'Fisso', fr:'Fixe', de:'Fest', ar:'ثابت', id:'Tetap' },
  'Intraday Trailing': { pt:'Trailing intradiário', es:'Trailing intradía', it:'Trailing intraday', fr:'Trailing intraday', de:'Intraday-Trailing', ar:'متحرك خلال اليوم', id:'Trailing intraday' },
  'Balance-based': { pt:'Sobre o saldo', es:'Sobre el saldo', it:'Sul saldo', fr:'Sur le solde', de:'Saldobasiert', ar:'على أساس الرصيد', id:'Berbasis saldo' },

  /* filtros */
  'DISCOUNT': { pt:'DESCONTO', es:'DESCUENTO', it:'SCONTO', fr:'REMISE', de:'RABATT', ar:'الخصم', id:'DISKON' },
  'Less than 50%': { pt:'Menos de 50%', es:'Menos del 50%', it:'Meno del 50%', fr:'Moins de 50%', de:'Weniger als 50%', ar:'أقل من 50%', id:'Kurang dari 50%' },
  'MY FAVORITES': { pt:'MEUS FAVORITOS', es:'MIS FAVORITOS', it:'I MIEI PREFERITI', fr:'MES FAVORIS', de:'MEINE FAVORITEN', ar:'مفضلتي', id:'FAVORIT SAYA' },
  'Only favorites': { pt:'Só favoritos', es:'Solo favoritos', it:'Solo preferiti', fr:'Favoris uniquement', de:'Nur Favoriten', ar:'المفضلة فقط', id:'Hanya favorit' },
  'Clear filters': { pt:'Limpar filtros', es:'Limpiar filtros', it:'Azzera filtri', fr:'Effacer les filtres', de:'Filter zurücksetzen', ar:'مسح عوامل التصفية', id:'Hapus filter' },
  'Showing': { pt:'Mostrando', es:'Mostrando', it:'Mostrando', fr:'Affichage de', de:'Angezeigt', ar:'عرض', id:'Menampilkan' },
  'companies': { pt:'firmas', es:'firmas', it:'società', fr:'sociétés', de:'Firmen', ar:'شركات', id:'perusahaan' },
  'Higher rating': { pt:'Melhor nota', es:'Mejor valoración', it:'Voto più alto', fr:'Meilleure note', de:'Beste Bewertung', ar:'أعلى تقييم', id:'Rating tertinggi' },
  'Free': { pt:'Grátis', es:'Gratis', it:'Gratis', fr:'Gratuit', de:'Kostenlos', ar:'مجاني', id:'Gratis' },

  /* notificações */
  'App & Coupon Alerts': { pt:'App e alertas de cupom', es:'App y alertas de cupón', it:'App e avvisi coupon', fr:'App et alertes coupon', de:'App & Coupon-Alarme', ar:'التطبيق وتنبيهات الكوبونات', id:'Aplikasi & Peringatan Kupon' },
  'Get the best coupons before everyone else': { pt:'Receba os melhores cupons antes de todo mundo', es:'Recibe los mejores cupones antes que nadie', it:'Ricevi i migliori coupon prima di tutti', fr:'Recevez les meilleurs coupons avant tout le monde', de:'Erhalte die besten Coupons vor allen anderen', ar:'احصل على أفضل الكوبونات قبل الجميع', id:'Dapatkan kupon terbaik sebelum yang lain' },
  'Enable notifications': { pt:'Ativar notificações', es:'Activar notificaciones', it:'Attiva le notifiche', fr:'Activer les notifications', de:'Benachrichtigungen aktivieren', ar:'تفعيل الإشعارات', id:'Aktifkan notifikasi' },
  'New code:': { pt:'Novo cupom:', es:'Nuevo cupón:', it:'Nuovo coupon:', fr:'Nouveau code :', de:'Neuer Code:', ar:'كود جديد:', id:'Kode baru:' },
  'now': { pt:'agora', es:'ahora', it:'ora', fr:'maintenant', de:'jetzt', ar:'الآن', id:'sekarang' },

  /* calendário */
  'Next high-impact event': { pt:'Próximo evento de alto impacto', es:'Próximo evento de alto impacto', it:'Prossimo evento ad alto impatto', fr:'Prochain événement à fort impact', de:'Nächstes Ereignis mit hoher Wirkung', ar:'الحدث التالي عالي التأثير', id:'Peristiwa berdampak tinggi berikutnya' },
  'Time': { pt:'Hora', es:'Hora', it:'Ora', fr:'Heure', de:'Zeit', ar:'الوقت', id:'Waktu' },
  'Currency': { pt:'Moeda', es:'Moneda', it:'Valuta', fr:'Devise', de:'Währung', ar:'العملة', id:'Mata uang' },
  'Event': { pt:'Evento', es:'Evento', it:'Evento', fr:'Événement', de:'Ereignis', ar:'الحدث', id:'Peristiwa' },
  'Actual': { pt:'Atual', es:'Actual', it:'Effettivo', fr:'Réel', de:'Aktuell', ar:'الفعلي', id:'Aktual' },
  'Forecast': { pt:'Previsão', es:'Previsión', it:'Previsione', fr:'Prévision', de:'Prognose', ar:'التوقع', id:'Perkiraan' },
  'Impact': { pt:'Impacto', es:'Impacto', it:'Impatto', fr:'Impact', de:'Auswirkung', ar:'التأثير', id:'Dampak' },

  /* heatmap e análise */
  'Heatmap · US stocks': { pt:'Mapa de calor · ações dos EUA', es:'Mapa de calor · acciones de EE.UU.', it:'Mappa di calore · azioni USA', fr:'Carte thermique · actions US', de:'Heatmap · US-Aktien', ar:'خريطة حرارية · أسهم أمريكية', id:'Peta panas · saham AS' },
  'real time': { pt:'tempo real', es:'tiempo real', it:'tempo reale', fr:'temps réel', de:'Echtzeit', ar:'الوقت الفعلي', id:'waktu nyata' },
  'Heatmap and professional indicators': { pt:'Mapa de calor e indicadores profissionais', es:'Mapa de calor e indicadores profesionales', it:'Mappa di calore e indicatori professionali', fr:'Carte thermique et indicateurs professionnels', de:'Heatmap und professionelle Indikatoren', ar:'خريطة حرارية ومؤشرات احترافية', id:'Peta panas dan indikator profesional' },
  'Gamma Exposure (GEX) levels for major indices': { pt:'Níveis de Gamma Exposure (GEX) dos principais índices', es:'Niveles de Gamma Exposure (GEX) de los principales índices', it:'Livelli di Gamma Exposure (GEX) dei principali indici', fr:'Niveaux de Gamma Exposure (GEX) des principaux indices', de:'Gamma-Exposure-Level (GEX) der wichtigsten Indizes', ar:'مستويات Gamma Exposure لأهم المؤشرات', id:'Level Gamma Exposure (GEX) untuk indeks utama' },
  'Support 1': { pt:'Suporte 1', es:'Soporte 1', it:'Supporto 1', fr:'Support 1', de:'Unterstützung 1', ar:'الدعم 1', id:'Support 1' },
  'Support 2': { pt:'Suporte 2', es:'Soporte 2', it:'Supporto 2', fr:'Support 2', de:'Unterstützung 2', ar:'الدعم 2', id:'Support 2' },
  'Resistance 1': { pt:'Resistência 1', es:'Resistencia 1', it:'Resistenza 1', fr:'Résistance 1', de:'Widerstand 1', ar:'المقاومة 1', id:'Resistance 1' },
  'Resistance 2': { pt:'Resistência 2', es:'Resistencia 2', it:'Resistenza 2', fr:'Résistance 2', de:'Widerstand 2', ar:'المقاومة 2', id:'Resistance 2' },
  'NEUTRAL': { pt:'NEUTRO', es:'NEUTRAL', it:'NEUTRALE', fr:'NEUTRE', de:'NEUTRAL', ar:'محايد', id:'NETRAL' },
  'Daily analysis with zones, scenarios and news impact': { pt:'Análise diária com zonas, cenários e impacto das notícias', es:'Análisis diario con zonas, escenarios e impacto de noticias', it:'Analisi giornaliera con zone, scenari e impatto delle notizie', fr:'Analyse quotidienne avec zones, scénarios et impact des news', de:'Tagesanalyse mit Zonen, Szenarien und Nachrichtenwirkung', ar:'تحليل يومي بالمناطق والسيناريوهات وتأثير الأخبار', id:'Analisis harian dengan zona, skenario, dan dampak berita' },
  'Economic calendar with high-impact events': { pt:'Calendário econômico com eventos de alto impacto', es:'Calendario económico con eventos de alto impacto', it:'Calendario economico con eventi ad alto impatto', fr:'Calendrier économique avec événements à fort impact', de:'Wirtschaftskalender mit wichtigen Ereignissen', ar:'تقويم اقتصادي بأحداث عالية التأثير', id:'Kalender ekonomi dengan peristiwa berdampak tinggi' },
  'every weekday at 5:00 AM ET': { pt:'todo dia útil às 5:00 AM ET', es:'cada día hábil a las 5:00 AM ET', it:'ogni giorno feriale alle 5:00 AM ET', fr:'chaque jour ouvré à 5h00 ET', de:'jeden Werktag um 5:00 Uhr ET', ar:'كل يوم عمل الساعة 5:00 صباحًا ET', id:'setiap hari kerja pukul 5:00 AM ET' },
  'professional': { pt:'profissional', es:'profesional', it:'professionale', fr:'professionnelle', de:'professionell', ar:'احترافي', id:'profesional' },

  /* comparar e quiz */
  'Firm': { pt:'Firma', es:'Firma', it:'Società', fr:'Société', de:'Firma', ar:'الشركة', id:'Perusahaan' },
  'Discount': { pt:'Desconto', es:'Descuento', it:'Sconto', fr:'Remise', de:'Rabatt', ar:'الخصم', id:'Diskon' },
  'Funded': { pt:'Financiada', es:'Fondeada', it:'Finanziata', fr:'Financée', de:'Finanziert', ar:'ممولة', id:'Didanai' },
  'Compare & Quiz': { pt:'Comparar e Quiz', es:'Comparar y Quiz', it:'Confronta e Quiz', fr:'Comparer et Quiz', de:'Vergleichen & Quiz', ar:'قارن واختبر', id:'Bandingkan & Kuis' },
  'Compare every firm before you choose': { pt:'Compare todas as firmas antes de escolher', es:'Compara todas las firmas antes de elegir', it:'Confronta tutte le società prima di scegliere', fr:'Comparez toutes les sociétés avant de choisir', de:'Vergleiche alle Firmen, bevor du wählst', ar:'قارن كل الشركات قبل الاختيار', id:'Bandingkan semua perusahaan sebelum memilih' },
  'Visual comparator with filters by type, price and rules': { pt:'Comparador visual com filtros por tipo, preço e regras', es:'Comparador visual con filtros por tipo, precio y reglas', it:'Comparatore visivo con filtri per tipo, prezzo e regole', fr:'Comparateur visuel avec filtres par type, prix et règles', de:'Visueller Vergleich mit Filtern nach Typ, Preis und Regeln', ar:'مقارن مرئي مع فلاتر حسب النوع والسعر والقواعد', id:'Pembanding visual dengan filter tipe, harga, dan aturan' },
  'Interactive quiz, find your ideal firm in 2 minutes': { pt:'Quiz interativo: ache sua firma ideal em 2 minutos', es:'Quiz interactivo: encuentra tu firma ideal en 2 minutos', it:'Quiz interattivo: trova la società ideale in 2 minuti', fr:'Quiz interactif : trouvez votre société idéale en 2 minutes', de:'Interaktives Quiz: finde in 2 Minuten deine passende Firma', ar:'اختبار تفاعلي: اعثر على شركتك المثالية في دقيقتين', id:'Kuis interaktif: temukan perusahaan ideal dalam 2 menit' },
  'Quiz · Your ideal firm': { pt:'Quiz · Sua firma ideal', es:'Quiz · Tu firma ideal', it:'Quiz · La tua società ideale', fr:'Quiz · Votre société idéale', de:'Quiz · Deine passende Firma', ar:'اختبار · شركتك المثالية', id:'Kuis · Perusahaan ideal Anda' },
  'Both': { pt:'Os dois', es:'Ambos', it:'Entrambi', fr:'Les deux', de:'Beide', ar:'كلاهما', id:'Keduanya' },

  /* live room */
  'Live & Indicators': { pt:'Ao vivo e indicadores', es:'En vivo e indicadores', it:'Live e indicatori', fr:'Live et indicateurs', de:'Live & Indikatoren', ar:'مباشر ومؤشرات', id:'Live & Indikator' },
  'VIP Live Room and exclusive indicators': { pt:'Sala VIP ao vivo e indicadores exclusivos', es:'Sala VIP en vivo e indicadores exclusivos', it:'Sala VIP live e indicatori esclusivi', fr:'Salle VIP live et indicateurs exclusifs', de:'VIP-Live-Raum und exklusive Indikatoren', ar:'غرفة VIP مباشرة ومؤشرات حصرية', id:'Ruang VIP live dan indikator eksklusif' },
  'Exclusive sessions for VIP members': { pt:'Sessões exclusivas para membros VIP', es:'Sesiones exclusivas para miembros VIP', it:'Sessioni esclusive per membri VIP', fr:'Sessions exclusives pour les membres VIP', de:'Exklusive Sessions für VIP-Mitglieder', ar:'جلسات حصرية لأعضاء VIP', id:'Sesi eksklusif untuk anggota VIP' },
  'Professional indicators for members only': { pt:'Indicadores profissionais só para membros', es:'Indicadores profesionales solo para miembros', it:'Indicatori professionali solo per membri', fr:'Indicateurs professionnels réservés aux membres', de:'Professionelle Indikatoren nur für Mitglieder', ar:'مؤشرات احترافية للأعضاء فقط', id:'Indikator profesional khusus anggota' },
  'Monthly funded-account giveaways': { pt:'Sorteios mensais de conta financiada', es:'Sorteos mensuales de cuenta fondeada', it:'Giveaway mensili di conto finanziato', fr:'Tirages mensuels de comptes financés', de:'Monatliche Verlosungen finanzierter Konten', ar:'سحوبات شهرية على حسابات ممولة', id:'Undian akun didanai bulanan' },

  /* ferramentas */
  'Free Tools': { pt:'Ferramentas grátis', es:'Herramientas gratis', it:'Strumenti gratuiti', fr:'Outils gratuits', de:'Kostenlose Tools', ar:'أدوات مجانية', id:'Alat gratis' },
  'Position Size Calculator': { pt:'Calculadora de tamanho de posição', es:'Calculadora de tamaño de posición', it:'Calcolatore dimensione posizione', fr:'Calculateur de taille de position', de:'Positionsgrößen-Rechner', ar:'حاسبة حجم المركز', id:'Kalkulator ukuran posisi' },
  'Account': { pt:'Conta', es:'Cuenta', it:'Conto', fr:'Compte', de:'Konto', ar:'الحساب', id:'Akun' },
  'Contracts': { pt:'Contratos', es:'Contratos', it:'Contratti', fr:'Contrats', de:'Kontrakte', ar:'العقود', id:'Kontrak' },
  'Professional risk-management tools': { pt:'Ferramentas profissionais de gestão de risco', es:'Herramientas profesionales de gestión de riesgo', it:'Strumenti professionali di gestione del rischio', fr:'Outils professionnels de gestion du risque', de:'Professionelle Risikomanagement-Tools', ar:'أدوات احترافية لإدارة المخاطر', id:'Alat manajemen risiko profesional' },

  /* guias e blog */
  'Guides & Education': { pt:'Guias e educação', es:'Guías y educación', it:'Guide e formazione', fr:'Guides et formation', de:'Ratgeber & Wissen', ar:'الأدلة والتعليم', id:'Panduan & Edukasi' },
  'BEGINNER': { pt:'INICIANTE', es:'PRINCIPIANTE', it:'PRINCIPIANTE', fr:'DÉBUTANT', de:'ANFÄNGER', ar:'مبتدئ', id:'PEMULA' },
  'INTERMEDIATE': { pt:'INTERMEDIÁRIO', es:'INTERMEDIO', it:'INTERMEDIO', fr:'INTERMÉDIAIRE', de:'FORTGESCHRITTEN', ar:'متوسط', id:'MENENGAH' },
  'PRACTICAL': { pt:'PRÁTICO', es:'PRÁCTICO', it:'PRATICO', fr:'PRATIQUE', de:'PRAXIS', ar:'عملي', id:'PRAKTIS' },

  /* awards */
  'Winner': { pt:'Vencedora', es:'Ganadora', it:'Vincitrice', fr:'Gagnante', de:'Gewinner', ar:'الفائز', id:'Pemenang' },
  'Runner-up': { pt:'Vice', es:'Segunda', it:'Seconda', fr:'Deuxième', de:'Zweiter', ar:'الوصيف', id:'Runner-up' },
  'Third': { pt:'Terceira', es:'Tercera', it:'Terza', fr:'Troisième', de:'Dritter', ar:'الثالث', id:'Ketiga' },
  'Best Overall': { pt:'Melhor geral', es:'Mejor general', it:'Migliore in assoluto', fr:'Meilleure globale', de:'Beste insgesamt', ar:'الأفضل إجمالًا', id:'Terbaik keseluruhan' },
  'Best for Futures': { pt:'Melhor para futuros', es:'Mejor para futuros', it:'Migliore per i futures', fr:'Meilleure pour les futures', de:'Beste für Futures', ar:'الأفضل للعقود الآجلة', id:'Terbaik untuk futures' },
  'Biggest Discount': { pt:'Maior desconto', es:'Mayor descuento', it:'Sconto maggiore', fr:'Plus grosse remise', de:'Größter Rabatt', ar:'أكبر خصم', id:'Diskon terbesar' },
  'Firms analyzed': { pt:'Firmas analisadas', es:'Firmas analizadas', it:'Società analizzate', fr:'Sociétés analysées', de:'Analysierte Firmen', ar:'شركات تم تحليلها', id:'Perusahaan dianalisis' },
  'Reviews considered': { pt:'Avaliações consideradas', es:'Reseñas consideradas', it:'Recensioni considerate', fr:'Avis pris en compte', de:'Berücksichtigte Bewertungen', ar:'مراجعات مأخوذة بالاعتبار', id:'Ulasan dipertimbangkan' },
  'Award categories': { pt:'Categorias premiadas', es:'Categorías premiadas', it:'Categorie premiate', fr:'Catégories primées', de:'Auszeichnungskategorien', ar:'فئات الجوائز', id:'Kategori penghargaan' },

  /* FAQ */
  'Frequently asked questions': { pt:'Perguntas frequentes', es:'Preguntas frecuentes', it:'Domande frequenti', fr:'Questions fréquentes', de:'Häufige Fragen', ar:'الأسئلة الشائعة', id:'Pertanyaan umum' },
  'Are the coupons really free?': { pt:'Os cupons são mesmo grátis?', es:'¿Los cupones son realmente gratis?', it:'I coupon sono davvero gratuiti?', fr:'Les coupons sont-ils vraiment gratuits ?', de:'Sind die Coupons wirklich kostenlos?', ar:'هل الكوبونات مجانية فعلًا؟', id:'Apakah kupon benar-benar gratis?' },
  'How do I use a coupon code?': { pt:'Como uso um cupom?', es:'¿Cómo uso un cupón?', it:'Come uso un coupon?', fr:'Comment utiliser un coupon ?', de:'Wie nutze ich einen Coupon?', ar:'كيف أستخدم الكوبون؟', id:'Bagaimana cara memakai kupon?' },
  'Are the discounts verified and up to date?': { pt:'Os descontos são verificados e atualizados?', es:'¿Los descuentos están verificados y al día?', it:'Gli sconti sono verificati e aggiornati?', fr:'Les remises sont-elles vérifiées et à jour ?', de:'Sind die Rabatte geprüft und aktuell?', ar:'هل الخصومات موثقة ومحدثة؟', id:'Apakah diskon terverifikasi dan terbaru?' },
  'Which firm is best for beginners?': { pt:'Qual firma é melhor para iniciantes?', es:'¿Qué firma es mejor para principiantes?', it:'Quale società è migliore per i principianti?', fr:'Quelle société convient aux débutants ?', de:'Welche Firma eignet sich für Einsteiger?', ar:'أي شركة أفضل للمبتدئين؟', id:'Perusahaan mana yang terbaik untuk pemula?' },
  'Do you offer support if I have a problem?': { pt:'Vocês dão suporte se eu tiver problema?', es:'¿Ofrecen soporte si tengo un problema?', it:'Offrite assistenza in caso di problemi?', fr:'Proposez-vous une assistance en cas de problème ?', de:'Bietet ihr Support bei Problemen?', ar:'هل تقدمون دعمًا إذا واجهت مشكلة؟', id:'Apakah ada dukungan jika saya bermasalah?' },

  /* rodapé */
  'Newsletter': { pt:'Newsletter', es:'Newsletter', it:'Newsletter', fr:'Newsletter', de:'Newsletter', ar:'النشرة البريدية', id:'Newsletter' },
  'Get the best Prop Firm deals and tips every week.': { pt:'Receba as melhores ofertas de Prop Firm e dicas toda semana.', es:'Recibe las mejores ofertas de Prop Firm y consejos cada semana.', it:'Ricevi ogni settimana le migliori offerte Prop Firm e consigli.', fr:'Recevez chaque semaine les meilleures offres Prop Firm et des conseils.', de:'Erhalte wöchentlich die besten Prop-Firm-Angebote und Tipps.', ar:'احصل على أفضل عروض Prop Firm ونصائح كل أسبوع.', id:'Dapatkan penawaran Prop Firm terbaik dan tips setiap minggu.' },
  'Subscribe': { pt:'Inscrever', es:'Suscribirse', it:'Iscriviti', fr:'S’abonner', de:'Abonnieren', ar:'اشترك', id:'Berlangganan' },
  'Trading Firms': { pt:'Firmas de trading', es:'Firmas de trading', it:'Società di trading', fr:'Sociétés de trading', de:'Trading-Firmen', ar:'شركات التداول', id:'Perusahaan trading' },
  'Tools': { pt:'Ferramentas', es:'Herramientas', it:'Strumenti', fr:'Outils', de:'Tools', ar:'الأدوات', id:'Alat' },
  'Company Quiz': { pt:'Quiz de firmas', es:'Quiz de firmas', it:'Quiz società', fr:'Quiz sociétés', de:'Firmen-Quiz', ar:'اختبار الشركات', id:'Kuis perusahaan' },
  'Comparison Tool': { pt:'Comparador', es:'Comparador', it:'Comparatore', fr:'Comparateur', de:'Vergleichstool', ar:'أداة المقارنة', id:'Alat perbandingan' },
  'Calendar': { pt:'Calendário', es:'Calendario', it:'Calendario', fr:'Calendrier', de:'Kalender', ar:'التقويم', id:'Kalender' },
  'App & Alerts': { pt:'App e alertas', es:'App y alertas', it:'App e avvisi', fr:'App et alertes', de:'App & Alarme', ar:'التطبيق والتنبيهات', id:'Aplikasi & Peringatan' },
  'Top Lists': { pt:'Listas', es:'Listas', it:'Classifiche', fr:'Classements', de:'Bestenlisten', ar:'القوائم', id:'Daftar Teratas' },
  'With Exclusive Coupon': { pt:'Com cupom exclusivo', es:'Con cupón exclusivo', it:'Con coupon esclusivo', fr:'Avec coupon exclusif', de:'Mit exklusivem Coupon', ar:'بكوبون حصري', id:'Dengan kupon eksklusif' },
  'No Activation Fee': { pt:'Sem taxa de ativação', es:'Sin cuota de activación', it:'Senza costo di attivazione', fr:'Sans frais d’activation', de:'Ohne Aktivierungsgebühr', ar:'بدون رسوم تفعيل', id:'Tanpa biaya aktivasi' },
  'Cheapest': { pt:'Mais baratas', es:'Más baratas', it:'Più economiche', fr:'Les moins chères', de:'Günstigste', ar:'الأرخص', id:'Termurah' },
  'Highest Rated': { pt:'Melhor avaliadas', es:'Mejor valoradas', it:'Meglio valutate', fr:'Les mieux notées', de:'Bestbewertet', ar:'الأعلى تقييمًا', id:'Rating tertinggi' },
  'Links': { pt:'Links', es:'Enlaces', it:'Link', fr:'Liens', de:'Links', ar:'روابط', id:'Tautan' },
  'Legal': { pt:'Jurídico', es:'Legal', it:'Legale', fr:'Mentions légales', de:'Rechtliches', ar:'قانوني', id:'Legal' },
  'Privacy Policy': { pt:'Política de privacidade', es:'Política de privacidad', it:'Informativa privacy', fr:'Politique de confidentialité', de:'Datenschutz', ar:'سياسة الخصوصية', id:'Kebijakan Privasi' },
  'Terms of Use': { pt:'Termos de uso', es:'Términos de uso', it:'Termini d’uso', fr:'Conditions d’utilisation', de:'Nutzungsbedingungen', ar:'شروط الاستخدام', id:'Ketentuan Penggunaan' },
  'Cookie Policy': { pt:'Política de cookies', es:'Política de cookies', it:'Informativa cookie', fr:'Politique de cookies', de:'Cookie-Richtlinie', ar:'سياسة ملفات الارتباط', id:'Kebijakan Cookie' },
  'Privacy': { pt:'Privacidade', es:'Privacidad', it:'Privacy', fr:'Confidentialité', de:'Datenschutz', ar:'الخصوصية', id:'Privasi' },
  'Terms': { pt:'Termos', es:'Términos', it:'Termini', fr:'Conditions', de:'AGB', ar:'الشروط', id:'Ketentuan' },
  'Home': { pt:'Início', es:'Inicio', it:'Home', fr:'Accueil', de:'Start', ar:'الرئيسية', id:'Beranda' },
  'Verified coupons, updated daily. Trading involves risk.': { pt:'Cupons verificados, atualizados todo dia. Trading envolve risco.', es:'Cupones verificados, actualizados a diario. El trading implica riesgo.', it:'Coupon verificati, aggiornati ogni giorno. Il trading comporta rischi.', fr:'Coupons vérifiés, mis à jour chaque jour. Le trading comporte des risques.', de:'Geprüfte Coupons, täglich aktualisiert. Trading birgt Risiken.', ar:'كوبونات موثقة، تُحدَّث يوميًا. التداول ينطوي على مخاطر.', id:'Kupon terverifikasi, diperbarui harian. Trading mengandung risiko.' },

  /* cadastro e login */
  'Create Account': { pt:'Criar conta', es:'Crear cuenta', it:'Crea account', fr:'Créer un compte', de:'Konto erstellen', ar:'إنشاء حساب', id:'Buat akun' },
  'Create account': { pt:'Criar conta', es:'Crear cuenta', it:'Crea account', fr:'Créer un compte', de:'Konto erstellen', ar:'إنشاء حساب', id:'Buat akun' },
  'Sign In': { pt:'Entrar', es:'Iniciar sesión', it:'Accedi', fr:'Se connecter', de:'Anmelden', ar:'تسجيل الدخول', id:'Masuk' },
  'Welcome to': { pt:'Bem-vindo à', es:'Bienvenido a', it:'Benvenuto in', fr:'Bienvenue chez', de:'Willkommen bei', ar:'مرحبًا بك في', id:'Selamat datang di' },
  'Unlock limitless trading opportunities.': { pt:'Destrave oportunidades ilimitadas de trading.', es:'Desbloquea oportunidades de trading sin límite.', it:'Sblocca opportunità di trading illimitate.', fr:'Débloquez des opportunités de trading illimitées.', de:'Schalte grenzenlose Trading-Chancen frei.', ar:'افتح فرص تداول بلا حدود.', id:'Buka peluang trading tanpa batas.' },
  'Sign up with Google': { pt:'Criar conta com Google', es:'Registrarse con Google', it:'Registrati con Google', fr:'S’inscrire avec Google', de:'Mit Google registrieren', ar:'التسجيل عبر Google', id:'Daftar dengan Google' },
  'or sign up with email': { pt:'ou crie conta com e-mail', es:'o regístrate con email', it:'oppure registrati con email', fr:'ou inscrivez-vous par e-mail', de:'oder mit E-Mail registrieren', ar:'أو سجّل بالبريد الإلكتروني', id:'atau daftar dengan email' },
  'To join promotions and giveaways we need your real data and best email.': { pt:'Para participar de promoções e sorteios precisamos dos seus dados reais e do seu melhor e-mail.', es:'Para participar en promociones y sorteos necesitamos tus datos reales y tu mejor email.', it:'Per partecipare a promozioni e giveaway servono i tuoi dati reali e la tua email migliore.', fr:'Pour participer aux promotions et tirages, nous avons besoin de vos vraies données et de votre meilleure adresse e-mail.', de:'Für Aktionen und Verlosungen brauchen wir deine echten Daten und deine beste E-Mail-Adresse.', ar:'للمشاركة في العروض والسحوبات نحتاج بياناتك الحقيقية وأفضل بريد إلكتروني لديك.', id:'Untuk ikut promosi dan undian, kami perlu data asli dan email terbaik Anda.' },
  'FULL NAME': { pt:'NOME COMPLETO', es:'NOMBRE COMPLETO', it:'NOME COMPLETO', fr:'NOM COMPLET', de:'VOLLSTÄNDIGER NAME', ar:'الاسم الكامل', id:'NAMA LENGKAP' },
  'EMAIL': { pt:'E-MAIL', es:'EMAIL', it:'EMAIL', fr:'E-MAIL', de:'E-MAIL', ar:'البريد الإلكتروني', id:'EMAIL' },
  'PASSWORD (MIN. 6 CHARACTERS)': { pt:'SENHA (MÍN. 6 CARACTERES)', es:'CONTRASEÑA (MÍN. 6 CARACTERES)', it:'PASSWORD (MIN. 6 CARATTERI)', fr:'MOT DE PASSE (MIN. 6 CARACTÈRES)', de:'PASSWORT (MIND. 6 ZEICHEN)', ar:'كلمة المرور (6 أحرف على الأقل)', id:'KATA SANDI (MIN. 6 KARAKTER)' },
  'I have read and accept the': { pt:'Li e aceito a', es:'He leído y acepto la', it:'Ho letto e accetto la', fr:'J’ai lu et j’accepte la', de:'Ich habe gelesen und akzeptiere die', ar:'قرأت وأوافق على', id:'Saya telah membaca dan menerima' },
  'I want to receive exclusive coupons and offers by email (+1 giveaway entry)': { pt:'Quero receber cupons e ofertas exclusivas por e-mail (+1 bilhete no sorteio)', es:'Quiero recibir cupones y ofertas exclusivas por email (+1 boleto en el sorteo)', it:'Voglio ricevere coupon e offerte esclusive via email (+1 biglietto al giveaway)', fr:'Je veux recevoir des coupons et offres exclusives par e-mail (+1 participation au tirage)', de:'Ich möchte exklusive Coupons und Angebote per E-Mail erhalten (+1 Los für die Verlosung)', ar:'أريد تلقي كوبونات وعروض حصرية بالبريد (+1 فرصة في السحب)', id:'Saya ingin menerima kupon dan penawaran eksklusif via email (+1 tiket undian)' },
  'Already have an account?': { pt:'Já tem conta?', es:'¿Ya tienes cuenta?', it:'Hai già un account?', fr:'Vous avez déjà un compte ?', de:'Schon ein Konto?', ar:'لديك حساب بالفعل؟', id:'Sudah punya akun?' }
};
