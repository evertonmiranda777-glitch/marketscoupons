export const B = {
toc: {
  lineage: '<li><a href="#lineage">Il lignaggio, da Wyckoff a Coulling</a></li>',
  analogies: '<li><a href="#analogies">Tre analogie che fanno scattare il VPA</a></li>',
  psych: '<li><a href="#psych">Perché la folla sbaglia sempre agli estremi</a></li>',
  walkthrough: '<li><a href="#walkthrough">Lettura di una sessione barra per barra</a></li>',
  cases: '<li><a href="#cases">Tre casi reali, 2008, 2020, 2000</a></li>',
  myths: '<li><a href="#myths">Cinque miti sul volume, smontati</a></li>',
  manage: '<li><a href="#manage">Gestire il trade + il diario</a></li>',
  hacks: '<li><a href="#hacks">Sette hack avanzati di VPA</a></li>',
},
lead2: `<p>Quello che segue è il metodo completo, non un assaggio: le tre leggi che reggono tutto, le forme di barra esatte che portano il segnale, i pattern di no-supply e climax che marcano le svolte prima che accadano, il ciclo a quattro fasi che dice quale tattica è persino permessa, tre setup ad alta probabilità con ingressi e stop meccanici, una lettura barra per barra di una sessione, tre casi dal 2000 al 2020, sette raffinamenti avanzati e la disciplina di rischio che tiene vivo un conto prop firm abbastanza a lungo perché il vantaggio paghi. Leggilo una volta per la mappa; torna ad esso come riferimento per il resto della tua vita da trader.</p>`,
lineage: `<h2 id="lineage">Il Lignaggio, Dal Nastro del Ticker allo Schermo</h2>

<p>Per fidarti di un metodo devi sapere da dove viene e perché è sopravvissuto. Il VPA non è un'invenzione degli anni 2010 vestita di gergo moderno; è il discendente diretto di come i trader di maggior successo dell'inizio del Novecento leggevano davvero il mercato, raffinato attraverso tre generazioni di praticanti, ognuna che ha aggiunto uno strato senza rompere le fondamenta.</p>

<p>Comincia con <b>Richard Wyckoff</b> (1873–1934). Iniziò come fattorino di borsa a quindici anni e a vent'anni gestiva già la propria società di brokeraggio. Cosa cruciale, aveva un accesso che il resto di noi non avrà mai: si sedette e intervistò gli operatori dominanti della sua epoca, tra cui Jesse Livermore e la cerchia di J.P. Morgan, e ne fece il reverse engineering del comportamento in principi insegnabili. Wyckoff pubblicava una lettera di mercato letta da centinaia di migliaia di persone e fondò una scuola il cui corso è ancora insegnato. La sua intuizione fu che il mercato poteva essere compreso come la campagna deliberata di un unico grande operatore, e che le impronte di quell'operatore erano visibili nella relazione tra prezzo e volume sul nastro. Le tre leggi, domanda/offerta, sforzo/risultato, causa/effetto, sono sue.</p>

<p>Il secondo strato è <b>Tom Williams</b> (1934–2016), ed è qui che il VPA come metodo con un nome si cristallizzò. Williams non era un accademico; passò circa quindici anni come trader di sindacato negli anni 60 e 70, letteralmente dal lato istituzionale del mercato, parte di un gruppo che accumulava e distribuiva posizioni grandi. Osservò, dall'interno, come l'operatore nasconde l'intenzione e dove il volume comunque lo tradisce. Ritiratosi da quel mondo, si propose di codificare ciò che aveva visto in un sistema utilizzabile da un trader da schermo (che divenne noto come VSA, Volume Spread Analysis). Il suo contributo fu il vocabolario preciso barra per barra: no-demand, no-supply, l'up-thrust, il test, e il focus implacabile sulla relazione tra lo spread di una barra, la sua chiusura e il volume sottostante.</p>

<p>Il terzo strato, e il motivo per cui un trader retail autodidatta può imparare tutto questo, è <b>Anna Coulling</b>. Il suo libro <i>A Complete Guide to Volume Price Analysis</i> prese il dialetto istituzionale di Williams e il quadro centenario di Wyckoff e li riscrisse in linguaggio moderno e semplice per il trader individuale con un laptop e un feed di dati. Coniò l'inquadramento accessibile "VPA", lo applicò a forex, futures, azioni e materie prime, e, cosa più importante, insistette che volume e prezzo vanno sempre letti insieme, mai separati. La maggior parte della comprensione retail moderna del volume viene direttamente dalla sua traduzione.</p>

<p>Perché un quadro costruito su un nastro di carta funziona ancora su un grafico NQ a 5 minuti nel 2026? Perché nulla di esso dipende dalla tecnologia. Dipende da due cose che non sono cambiate e non cambieranno: i partecipanti grandi non possono ancora muovere size senza lasciare una firma di volume, e le folle umane raggiungono ancora il massimo di paura e avidità esattamente nei momenti sbagliati. Il mezzo si è evoluto da nastro a schermo ad algoritmo; il comportamento sottostante è identico. Questa è la differenza tra un metodo e una moda.</p>`,
analogies: `<h2 id="analogies">Tre Analogie che Fanno Scattare il VPA</h2>

<p>I principi astratti si fissano quando si legano a qualcosa di fisico. Queste tre analogie sono quelle che accendono la lampadina per la maggior parte dei trader.</p>

<p><b>Il bookmaker.</b> Pensa all'operatore come a un bookmaker, non a uno scommettitore. Il bookmaker non scommette sull'esito; gestisce il flusso di denaro su entrambi i lati e guadagna dallo spread e dall'essere posizionato contro il pubblico quando il pubblico sbaglia. Il volume è il libro del bookmaker, ti dice dove si ammassa il denaro del pubblico, che è esattamente il lato che il bookmaker sta silenziosamente fadeando. Quando leggi un climax di acquisto, vedi il pubblico caricare un lato mentre il bookmaker prende l'altro.</p>

<p><b>Impronte nella neve.</b> Un animale grande non può attraversare un campo innevato senza lasciare tracce, per quanto attento sia. L'operatore è l'animale grande; il volume è la neve. Può mascherare la direzione, frazionare gli ordini e lavorare in silenzio, ma la dimensione di ciò che deve transare lascia una traccia nel volume che un occhio allenato può seguire. Il prezzo dice che l'animale è passato; il volume dice quanto era pesante e dove era diretto davvero.</p>

<p><b>La casa d'aste.</b> Un mercato è un'asta continua a doppio senso. Il prezzo è il bid-ask attuale; il volume è la quantità di lotti che cambiano davvero mano a ogni livello. Un prezzo che sale su volume sottile è un banditore che canta numeri più alti a una sala vuota, nessun compratore reale, solo rumore. Un prezzo che sale su volume pesante è una sala piena di palette in competizione. Lo stesso numero sul tabellone significa cose opposte a seconda di quanti stanno davvero rilanciando, e solo il volume te lo dice.</p>

<p>Tieni a mente queste tre e le barre smettono di sembrare forme casuali. Inizi a vedere la posizione del bookmaker, la dimensione dell'animale e quanto è piena la sala, su ogni singola barra.</p>`,
nosupply: `<div class="deep">
<h4>Cos'è</h4>
<p>Una barra di no-supply è una barra ribassista stretta il cui volume è inferiore a quello delle due barre precedenti, il mercato ha sondato più in basso e non ha trovato venditori. La barra di no-demand è il suo specchio sui massimi.</p>
<h4>Come funziona</h4>
<p>Il prezzo fa un nuovo minimo (o massimo) marginale, ma il volume che dovrebbe accompagnare una vendita (o un acquisto) genuino semplicemente non c'è. L'assenza di partecipazione è il segnale, dice che il lato che guidava il movimento ha lasciato l'asta in silenzio.</p>
<h4>Perché funziona</h4>
<p>Un trend ha bisogno di carburante continuo. Quando l'operatore finisce di accumulare, smette di comprare ed esegue un test: una piccola sonda più in basso per confermare che la vendita retail si è esaurita. Volume basso su quella sonda è la conferma dell'operatore stesso, e la leggi da sopra la sua spalla.</p>
<h4>Come applicarla</h4>
<p>Marca prima la fase (agisci sul no-supply solo in accumulazione o markup). Poi pretendi volume sotto le due barre precedenti, entra alla chiusura della barra e metti lo stop qualche tick oltre il suo estremo.</p>
<h4>L'errore comune</h4>
<p>Agire su un no-supply nella fase sbagliata. In distribuzione, una barra ribassista a basso volume non è un segnale di acquisto, è la calma prima del markdown. Il contesto di fase è tutto.</p>
<h4>La scorciatoia</h4>
<p>Abbinalo a un livello di supporto noto o al VWAP. Un test di no-supply che cade esattamente su un nodo ad alto volume precedente ha due ragioni indipendenti per tenere, e il win rate sale nettamente.</p>
<h4>Il segreto</h4>
<p>Le barre di no-supply più potenti arrivano <i>dopo</i> uno shakeout (uno spring). Il mercato intrappola i venditori sotto il supporto, e il test che rivisita la zona in no-supply è l'acquisto a più alta probabilità che il metodo offre.</p>
<h4>L'esempio reale</h4>
<p>Il minimo dell'S&amp;P del 6 marzo 2009 (666) fu un nuovo minimo marginale su volume in crollo, una conferma classica di no-supply del climax di vendita dell'ottobre 2008, settimane prima che il trend invertisse davvero.</p>
<h4>Lo scenario ideale</h4>
<p>Un trend rialzista confermato (markup) che ritraccia su una media mobile o un livello di rottura precedente, stampando una barra ribassista stretta con volume che si restringe visibilmente. Massima chiarezza, minimo rischio.</p>
<h4>Lo scenario sbagliato</h4>
<p>Un range laterale senza direzione e senza fase stabilita. Le barre di no-supply stampano di continuo nel chop e non significano nulla, non c'è operatore che esegue un test, solo bassa partecipazione generale.</p>
</div>`,
climax: `<div class="deep">
<h4>Cos'è</h4>
<p>Un climax è l'unica barra in cui un'emozione raggiunge il picco: la barra più ampia del movimento, sul volume più alto da settimane, che chiude ben lontano dal suo estremo, quella chiusura-lontano-dall'estremo è l'impronta dell'assorbimento.</p>
<h4>Come funziona</h4>
<p>La folla raggiunge il massimo di paura (fondo) o avidità (cima) e transa in un frenesi. L'operatore composto prende tutto l'altro lato su scala. Il volume enorme è l'emozione della folla; la chiusura rifiutata è l'assorbimento dell'operatore.</p>
<h4>Perché funziona</h4>
<p>I mercati girano nel punto di massima partecipazione sul lato sbagliato, perché una volta che tutti quelli che dovevano andare in panico (o inseguire) hanno agito, non resta nessuno a continuare il movimento. Il climax è quell'esaurimento reso visibile nel volume.</p>
<h4>Come applicarla</h4>
<p>Non operare mai la barra di climax stessa. Aspetta il test: una barra successiva che tiene oltre l'estremo del climax (un minimo più alto dopo un climax di vendita) su volume ben sotto il climax. Entra sul test, stop oltre l'estremo del climax.</p>
<h4>L'errore comune</h4>
<p>Prendere il coltello che cade, comprare la barra di climax in tempo reale. Senza il test, non hai conferma che l'assorbimento abbia tenuto, e una seconda gamba di climax può buttarti fuori.</p>
<h4>La scorciatoia</h4>
<p>Usa la regola del 50%: il test valido deve recuperare più della metà del range della barra di climax. Se non ci riesce, l'assorbimento era debole e un minimo più basso è probabile.</p>
<h4>Il segreto</h4>
<p>La barra di volume più grande e terrificante è quella su cui agire, non da evitare. L'istinto del retail di fuggire dalla barra più spaventosa è esattamente il motivo per cui l'operatore può riempire lì. Il tuo vantaggio è fare l'opposto del tuo istinto.</p>
<h4>L'esempio reale</h4>
<p>10 ottobre 2008 (climax di vendita, volume record, chiusura sopra il minimo) e 10 marzo 2000 (climax di acquisto sul Nasdaq, volume record, chiusura rifiutata) sono i due casi canonici, direzioni opposte, impronta identica.</p>
<h4>Lo scenario ideale</h4>
<p>Un trend esteso ed esausto che entra in un livello importante, poi una barra di volume sproporzionato che chiude forte contro il trend. Massimo esaurimento, massimo segnale.</p>
<h4>Lo scenario sbagliato</h4>
<p>Una barra di alto volume nel mezzo di un trend sano che chiude <i>nella direzione</i> del trend. Quello non è climax, è forza. Il climax richiede la chiusura rifiutata.</p>
</div>`,
psych: `<h2 id="psych">Perché la Folla Sbaglia Sempre agli Estremi</h2>

<p>Il VPA funziona per una verità strutturale su come sono costruiti i mercati, non per un trucco. Capire il <i>perché</i> a questo livello è ciò che ti permette di tenere una posizione che sembra folle, comprare la barra più terrificante di un crash, con convinzione invece che con speranza.</p>

<p>Parti da un semplice fatto contabile: perché il mercato faccia un fondo importante, il numero massimo di persone deve già essere posizionato corto o liquido. Se la maggioranza fosse ancora rialzista, ci sarebbe altra vendita in arrivo e il fondo non terrebbe. Quindi un fondo duraturo <i>richiede</i> pessimismo massimo, non è una coincidenza che i fondi sembrino orribili, è una necessità strutturale. La stessa logica si inverte sulle cime: una cima richiede che quasi tutti quelli che potevano comprare l'abbiano già fatto, ecco perché le cime sembrano euforiche e ovvie. L'emozione non è rumore attorno alla svolta; l'emozione <b>è</b> la svolta.</p>

<p>Ora aggiungi l'operatore. Un partecipante che deve comprare una posizione molto grande ha un problema: il suo stesso acquisto spinge il prezzo contro di lui, alzando il suo costo medio. L'unico posto dove riempie size a buon mercato è dentro vendita pesante, dentro il panico esatto che il pessimismo massimo produce. Quindi l'operatore è strutturalmente forzato a essere compratore quando la folla è più disperata di vendere, e venditore quando la folla è più disperata di comprare. Non è più intelligente sulla notizia; è posizionato opposto all'emozione perché quello è l'unico modo di transare size. Il volume è la ricevuta di quella transazione.</p>

<p>Ecco perché la barra di climax ha la sua forma specifica. Il volume enorme è la folla che capitola; la chiusura che rifiuta l'estremo è l'operatore che la assorbe. Non stai prevedendo il futuro quando leggi un climax di vendita, stai leggendo, in tempo reale, il momento in cui il grande compratore ha sopraffatto il panico. La "previsione" è semplicemente il riconoscimento che, una volta che il numero massimo di venditori ha venduto, il percorso di minor resistenza si inverte.</p>

<p>La conseguenza pratica è scomoda ma liberatoria: <b>il tuo istinto sbaglierà a ogni svolta importante, e questo è il segnale.</b> Quando una barra ti fa venire voglia di scappare, quella paura è condivisa da tutta la folla, il che significa che la vendita sta culminando, il che significa che l'operatore sta riempiendo. La disciplina del VPA è, in gran parte, la disciplina di agire contro la tua stessa lettura emotiva del grafico e fidarti del volume. Il trader che interiorizza questo smette di aver bisogno di coraggio alle svolte, legge semplicemente la ricevuta e agisce.</p>`,
spring: `<div class="deep">
<h4>Cos'è</h4>
<p>Uno spring è una rottura falsa sotto il supporto di un range di accumulazione che inverte immediatamente verso l'interno, intrappolando i venditori che l'hanno rotta. L'evento operabile è il <i>test</i> a basso volume dello spring, non la barra dello spring stessa.</p>
<h4>Come funziona</h4>
<p>L'operatore provoca (o semplicemente sfrutta) un tuffo sotto un supporto ovvio. Gli stop di chi ha comprato il range scattano e gli short di rottura entrano, entrambi diventano compratori futuri forzati. Il prezzo rientra nel range su volume forte, e una sonda successiva a basso volume verso il minimo dello spring conferma che non restano venditori.</p>
<h4>Perché funziona</h4>
<p>È costruito sugli stop di altri trader. Ogni short intrappolato deve alla fine comprare per coprirsi, fornendo carburante incorporato al markup. Lo spring converte gli ordini di protezione della folla nella rampa di lancio dell'operatore.</p>
<h4>Come applicarla</h4>
<p>Identifica un supporto orizzontale chiaro con più tocchi. Su una rottura al ribasso che tiene solo una o due barre e inverte, aspetta il test: un ritorno verso la zona dello spring su volume ben sotto la barra dello spring, senza nuovo minimo. Entra alla chiusura del test, stop sotto il minimo dello spring.</p>
<h4>L'errore comune</h4>
<p>Vendere la rottura iniziale sotto il supporto, proprio la trappola che lo spring è progettato per tendere. Se il supporto rompe su volume <i>basso</i> e rientra, quello è uno spring, non un breakdown.</p>
<h4>La scorciatoia</h4>
<p>Uno spring genuino di solito ha volume maggiore sulla barra dello shakeout che sul test. Se il volume del test non è visibilmente minore di quello dello spring, diffida.</p>
<h4>Il segreto</h4>
<p>I migliori spring avvengono dopo un range di accumulazione lungo e noioso, più ovvio e definito è il supporto, più stop ci sono sotto, e più carburante la trappola rilascia.</p>
<h4>L'esempio reale</h4>
<p>Gli spring sono più visibili su singole sessioni di futures; sul giornaliero, molti minimi importanti (inclusi nuovi minimi marginali che invertono all'istante su volume che si restringe) sono spring del range precedente.</p>
<h4>Lo scenario ideale</h4>
<p>Un range di diverse settimane con supporto netto, una puntura brusca al ribasso su un picco di notizia, un recupero immediato, poi un test tranquillo giorni dopo che tiene sopra il minimo dello spring.</p>
<h4>Lo scenario sbagliato</h4>
<p>Una rottura sotto il supporto su volume crescente e sostenuto che continua a chiudere più in basso. Quello è un breakdown reale (markdown), non uno spring, non fargli fade.</p>
</div>`,
walkthrough: `<h2 id="walkthrough">Lettura di una Sessione Barra per Barra</h2>

<p>La teoria diventa istinto solo quando la vedi dispiegarsi in sequenza. Ecco come un trader di VPA disciplinato legge una sessione rappresentativa sull'ES, non una sessione reale datata, ma un composto dei pattern che si ripetono quasi ogni giorno. Segui la logica, non i numeri.</p>

<p><b>Pre-mercato.</b> Prima dell'apertura, il trader marca la fase del timeframe maggiore sul grafico giornaliero: l'ES è in markup stabile da tre settimane, ritracciando educatamente alla sua media in salita ogni volta. Il bias del giorno è quindi <i>acquisti sulla debolezza</i>, mai vendite, prima la fase.</p>

<p><b>L'apertura.</b> I primi quindici minuti sono violenti e ad alto volume, come sempre. Il trader non fa nulla. Il volume di apertura è meccanico, fondi che eseguono ordini alla campanella, e porta poca informazione direzionale. Leggere sforzo-vs-risultato qui è rumore; l'asta non si è assestata.</p>

<p><b>Pullback di metà mattina.</b> Verso le 10:30 l'indice deriva al ribasso verso la sua media mobile in salita. Il trader osserva le barre ribassiste: la prima è ampia su volume decente (vendita reale), ma le due successive si restringono e il loro volume si restringe visibilmente sotto le barre precedenti. È la sequenza di no-supply, venditori che si esauriscono sul supporto, dentro un markup stabilito. È il setup che il giorno aspettava.</p>

<p><b>L'ingresso.</b> Una barra ribassista stretta stampa con volume chiaramente sotto le due barre precedenti e chiude a metà range, rifiutando di fare un nuovo minimo rilevante. Il trader entra alla sua chiusura, stop qualche tick sotto il minimo. Il rischio è piccolo perché la barra è piccola, il regalo strutturale del VPA.</p>

<p><b>Il mantenimento.</b> Il prezzo sale. Le barre rialziste ora mostrano volume in espansione e chiudono vicino ai massimi, domanda sana che conferma la lettura. Il trader tiene, realizza un terzo sul massimo dello swing precedente e sposta lo stop a breakeven. Il rischio ora è zero; il resto è denaro del banco.</p>

<p><b>L'avvertimento.</b> Nel primo pomeriggio, il prezzo si trascina a un nuovo massimo marginale, ma la barra è stretta e il suo volume è il minore in una dozzina di barre. No-demand. I compratori che hanno portato il movimento hanno smesso di presentarsi. Il trader non vende in panico tutta la posizione, ma stringe lo stop mobile sotto l'ultimo minimo più alto, perché il carburante è finito.</p>

<p><b>L'uscita.</b> Due barre dopo una barra ribassista più ampia toglie quello stop mobile. Il trader è fuori, avendo catturato il grosso della gamba di markup e uscito nel momento in cui il volume ha detto che la domanda se n'era andata. Niente previsione, niente opinione, niente notizia, solo una sequenza di letture di volume, ognuna una decisione piccola e ripetibile. Ecco com'è davvero una sessione di VPA: per lo più attesa, poche letture precise, e uscite guidate dalla scomparsa del lato che ti stava pagando.</p>`,
cases: `<h2 id="cases">Tre Casi Reali, La Stessa Impronta, Tre Decenni di Distanza</h2>

<p>I pattern che vedi solo nei libri sembrano astratti. I pattern che vedi ripetersi nei più grandi eventi di mercato degli ultimi venticinque anni sembrano inevitabili. Ecco tre punti di svolta che ogni principio di VPA di questa guida ha previsto in tempo reale, non con il senno di poi, ma con la firma di volume esatta che abbiamo descritto. Date e cifre sono di pubblico dominio; aprile su qualsiasi grafico e leggi il volume tu stesso.</p>

<div class="story">
<h4>Caso 1, Il Climax di Vendita dell'Ottobre 2008 (S&amp;P 500)</h4>
<p>Il collasso di Lehman Brothers il 15 settembre 2008 iniziò una cascata. Nelle settimane seguenti l'S&amp;P 500 cadde senza tregua, e il <b>10 ottobre 2008</b> stampò un climax di vendita di proporzioni storiche: un range intraday di circa 100 punti, il più alto volume settimanale che l'indice avesse mai registrato fino ad allora, e una chiusura che si sollevò drammaticamente sopra il minimo di sessione. Quella chiusura-sopra-il-minimo è l'impronta dell'assorbimento, qualcuno di enorme comprava ogni azione che il panico lanciava. Il VIX, il misuratore di paura, schizzò verso 70 e avrebbe toccato un intraday di 89,53 il 24 ottobre. Un lettore di VPA non aveva bisogno di chiamare il fondo esatto; aveva bisogno di riconoscere che uno sforzo massimo (volume record) aveva prodotto un risultato fallito (una chiusura ben sopra il minimo), e che quella è la firma classica della capitolazione. Il mercato ondeggiò violentemente per mesi, ma il climax marcò il momento in cui l'offerta si esaurì. Il fondo vero arrivò il 6 marzo 2009 a S&amp;P 666, su un test tranquillo e a basso volume che fece un nuovo minimo marginale mentre il volume si seccava, la conferma classica di no-supply. Sforzo, risultato, assorbimento, test: l'intero vocabolario, scritto lungo il peggior crash in ottant'anni.</p>
</div>

<div class="story">
<h4>Caso 2, La Capitolazione del COVID nel Marzo 2020 (S&amp;P 500)</h4>
<p>Il bear market più veloce della storia: l'S&amp;P 500 cadde di circa il 34% in appena 23 sedute, dal massimo del 19 febbraio 2020 al minimo del 23 marzo 2020 a 2.191. La settimana del 16–20 marzo produsse volume colossale e un VIX che chiuse a 82,69 il 16 marzo, letture che rivaleggiano o superano il 2008. La barra di capitolazione del 23 marzo aveva la forma ormai familiare: volume enorme, range ampio, e una chiusura che rifiutò di restare sul minimo. L'operatore composto accumulava dentro i titoli più spaventosi di una generazione. Ciò che rende questo caso istruttivo è la velocità: l'intera fase di accumulazione che richiese mesi nel 2008–09 fu compressa in giorni nel 2020, perché la causa (lo shock COVID) fu improvvisa anziché strutturale. Stessa impronta, orologio diverso. Un trader che leggeva il volume invece dei titoli vide sforzo-senza-risultato-ribassista nel momento esatto in cui la folla era più certa che il mondo stesse finendo.</p>
</div>

<div class="story">
<h4>Caso 3, Il Climax di Acquisto del Marzo 2000 (Nasdaq Composite)</h4>
<p>I climax funzionano in entrambe le direzioni, e la cima delle dot-com è il climax di acquisto più pulito dell'era moderna. Il Nasdaq Composite toccò il picco intraday di 5.048,62 il <b>10 marzo 2000</b> dopo un'ascesa quasi verticale, sul volume più pesante che l'indice avesse mai visto, il blow-off. L'euforia retail era totale; tutti "sapevano" che la nuova economia aveva abrogato le vecchie regole. Quel volume record con una chiusura in stallo e rifiutata era l'impronta della distribuzione: l'operatore composto scaricava inventario nell'ultima ondata di domanda frenetica. L'indice non avrebbe rivisto quel livello per quindici anni. La lezione è identica a quella del climax di vendita, invertita: la barra che sembrò più eccitante, quella che gridava "finalmente rompe per davvero", fu il momento preciso in cui lo smart money consegnò la sua posizione alla folla. Avidità massima, volume massimo, continuazione fallita.</p>
</div>

<p>Tre eventi, tre decenni, due direzioni, un'impronta. Gli strumenti sono cambiati, i titoli sono cambiati, la velocità è cambiata. La firma nel volume no. Quella ripetibilità è il motivo per cui un quadro centenario funziona ancora: non è abbinare pattern su forme di prezzo, che mutano, ma su comportamento umano agli estremi, che non muta.</p>`,
instruments: `<p>Un po' più di profondità su ciascuno, perché lo stesso segnale di VPA si comporta diversamente a seconda della microstruttura dello strumento:</p>

<p><b>ES (futures S&amp;P 500)</b> è lo strumento di VPA del conoscitore. La sua profondità fa sì che climax e test di no-supply stampino con chiarezza insolita, e i segnali falsi sono più rari perché muovere l'ES richiede size genuina. Il compromesso è che la sessione di mezzogiorno può comprimersi in un range stretto a basso volume dove ogni barra sembra un no-supply e nessuna lo è, la trappola della sessione morta nella forma più pura. Opera l'apertura e il pomeriggio; rispetta la calma del pranzo.</p>

<p><b>NQ (futures Nasdaq 100)</b> si muove più veloce e più ampio dell'ES sulla stessa notizia, il che rende i suoi climax più drammatici ma i suoi stop devono essere più ampi. La firma di volume è altrettanto leggibile, ma la velocità punisce l'esitazione, un test di no-supply su NQ si risolve in meno barre, quindi il tuo ingresso deve essere meccanico. I principianti spesso fanno meglio imparando i pattern sull'ES prima, e passando all'NQ quando le letture sono automatiche.</p>

<p><b>CL (futures petrolio)</b> dà i picchi di climax più violenti dei quattro, il che rende le sue inversioni drammatiche e redditizie, ma sbanda forte attorno al report settimanale delle scorte EIA (mercoledì, 10:30 ET) e ai titoli mensili dell'OPEC. La disciplina qui è la consapevolezza del calendario: resta fuori durante il report, poi leggi il volume quando l'asta si normalizza. CL premia la pazienza e punisce chi opera volume durante uno shock programmato.</p>

<p><b>GC (futures oro)</b> mostra range di accumulazione splendidamente puliti perché l'oro passa lunghi periodi in equilibrio, costruendo causa prima di un rilascio. La sua debolezza è la sessione asiatica sottile, dove una manciata di contratti muove il prezzo e il segnale di volume diventa inaffidabile. Leggi GC durante Londra e USA; tratta le barre asiatiche notturne come a bassa confidenza.</p>`,
myths: `<h2 id="myths">Cinque Miti sul Volume, Smontati</h2>

<p>Il cattivo folklore del volume è ovunque, e la maggior parte danneggia attivamente i trader. Chiarire questi cinque equivoci vale quanto imparare i setup.</p>

<p><b>Mito 1, "Il volume conferma il trend."</b> Mezza verità e pericolosamente incompleto. Il volume conferma un movimento solo quando sforzo e risultato concordano. Prezzo che sale su volume crescente con chiusure vicino ai massimi conferma; prezzo che sale su volume crescente con chiusure a metà (assorbimento) avverte di inversione. "Il volume conferma la direzione" senza leggere la chiusura è come i trader comprano la cima esatta.</p>

<p><b>Mito 2, "Il volume alto è rialzista."</b> Il volume non ha direzione intrinseca. La stessa barra di volume enorme è un climax di acquisto (ribassista) su una cima e un climax di vendita (rialzista) su un fondo. Il volume misura l'intensità della partecipazione, non la sua direzione, la chiusura e la fase ti dicono la direzione.</p>

<p><b>Mito 3, "Serve il Level 2 / il book per leggere il volume."</b> Il book mostra ordini a riposo (intenzioni), che possono essere spoofati e ritirati. Il volume negoziato mostra ciò che è stato davvero eseguito (impegno), che non può essere falsificato. Il VPA su un grafico semplice prezzo + volume legge l'impegno, il più onesto dei due. Il Level 2 è un'aggiunta utile, non un prerequisito.</p>

<p><b>Mito 4, "Gli indicatori di volume (OBV, ecc.) sostituiscono la lettura delle barre."</b> Gli indicatori di volume cumulativo levigano proprio l'informazione più importante: la relazione tra lo spread, la chiusura e il volume di questa barra. Sono riassunti, e i riassunti nascondono il climax e il test di no-supply, proprio le barre che operi. Usali per contesto di divergenza, mai come sostituto della lettura della barra.</p>

<p><b>Mito 5, "Il volume non conta nei mercati 24h o dominati da algo."</b> Gli algoritmi sono i partecipanti più grandi di tutti, e nemmeno loro possono transare size senza lasciare volume. Semmai, l'esecuzione algoritmica lascia le impronte più pulite, perché accumulazione e distribuzione programmatiche sono più sistematiche di quelle umane. Il mezzo è cambiato; la legge che la size lascia una traccia no.</p>`,
confluence: `<p>Un avvertimento sulla confluenza: più strumenti non è più vantaggio. La tentazione, una volta che hai VWAP, profile e RVOL sullo schermo, è aspettare che tutti concordino, e il mercato raramente ti dà un allineamento perfetto a cinque fattori prima di muoversi. Il professionista usa una o due conferme per graduare un segnale di VPA, non cinque per paralizzarlo. La lettura del volume è il motore; gli strumenti extra sono il cruscotto, utili per il contesto ma mai un motivo per ignorare un test di no-supply pulito che il motore ha già dato. Se ti ritrovi ad aggiungere un sesto indicatore per sentirti sicuro, il problema non è il grafico, è che non ti sei ancora fidato del volume.</p>`,
manage: `<h2 id="manage">Gestire il Trade Dopo l'Ingresso, e il Diario che Costruisce il Vantaggio</h2>

<p>La maggior parte del materiale di VPA si ferma all'ingresso. Ma l'ingresso è forse un terzo del risultato; ciò che fai dopo essere stato riempito, e ciò che registri dopo, è da dove viene la consistenza.</p>

<h3>Gestire la posizione</h3>

<p>Una volta dentro un trade di VPA, la stessa logica di volume che ti ha fatto entrare governa come resti. Dopo un ingresso di pullback no-supply in markup, tieni finché le barre rialziste mostrano volume in espansione e i pullback mostrano volume che si restringe, il ritmo sano del markup. Nel momento in cui vedi l'opposto (barre rialziste su volume che si restringe, una barra di no-demand che fa un nuovo massimo), la domanda che ti ha portato è finita ed è ora di stringere o uscire. Non gestisci solo per un obiettivo fisso; leggi se l'operatore è ancora dalla tua parte.</p>

<p>Realizza a scaglioni sulla struttura. Prendi profitto parziale sul primo massimo di swing precedente (o sul massimo dell'auto-rally dopo un'inversione di climax), sposta lo stop a breakeven, e lascia correre il resto contro la struttura mobile. Il primo obiettivo paga il trade e rimuove il rischio; il runner è dove appare l'asimmetria rendimento-rischio del VPA. L'errore di gestione più comune è l'opposto, lasciar correre tutta la posizione per un home run e restituire il primo obiettivo facile quando appare la prima barra di no-demand.</p>

<p>Rispetta l'invalidazione in modo assoluto. Tutto il vantaggio degli stop stretti del VPA evapora se li allarghi nel momento. Se il prezzo toglie il minimo dello spring, il minimo del climax o il minimo della barra di no-supply, la lettura era sbagliata, non "in anticipo", sbagliata. Esci e rileggi. Il mercato offrirà un'altra barra; un conto bruciato no.</p>

<h3>Il diario che compone</h3>

<p>Il VPA è riconoscimento di pattern, e il riconoscimento di pattern si costruisce con ripetizione deliberata e rivista. Un diario basato su screenshot è l'acceleratore più veloce che esista. Per ogni trade, cattura il grafico all'ingresso e annota quattro cose: la fase che credevi di essere, il segnale specifico (no-supply / test di climax / spring), la lettura di volume che l'ha confermato e dove stava l'invalidazione. Poi, alla chiusura del trade, aggiungi una quinta nota: cosa è successo davvero e se la tua lettura di fase era corretta.</p>

<p>Rivedi settimanalmente, ordinando per esito. Cacci due cose. Primo, i setup dove il tuo win rate è genuinamente alto, concentrati lì e taglia il resto. Secondo, il motivo ricorrente per cui i tuoi perdenti falliscono; in quasi ogni diario di trader la risposta è la stessa, hanno preso il segnale giusto nella fase sbagliata, o in una sessione strutturalmente morta. Nominare la falla è ciò che la chiude. Un trader con cento screenshot annotati legge il volume in un modo che nessuna quantità di teoria produce, perché ha costruito il riconoscimento empiricamente, non intellettualmente.</p>`,
hacks: `<h2 id="hacks">Sette Hack Avanzati di VPA che i Corsi Fanno Pagare</h2>

<p>Una volta che i fondamentali sono automatici, questi raffinamenti separano un lettore competente da uno affilato. Ognuno è una regola concreta e testabile, non un principio vago, il tipo di vantaggio che compone su centinaia di trade.</p>

<ol>
  <li><b>La regola delle due barre di volume.</b> Una barra di no-demand o no-supply conta solo se il suo volume è inferiore a <i>entrambe</i> le barre precedenti, non solo una. Questo singolo filtro rimuove la maggior parte dei segnali falsi, perché conferma un calo genuino e sostenuto di partecipazione invece di un lampo di una barra.</li>
  <li><b>L'esaurimento della domanda ha bisogno di un'ancora al VWAP.</b> Un test di no-supply che tiene <i>sopra</i> il VWAP di sessione è drammaticamente più forte di uno sotto. Le istituzioni che usano il VWAP come benchmark di esecuzione sono, per definizione, compratrici disposte sopra di esso, quindi un test a basso volume lì ha il denaro grande dalla tua parte. Sotto il VWAP, ci litighi.</li>
  <li><b>La regola del 50% del climax.</b> Dopo un climax genuino, misura il range della barra di climax. Il primo test valido deve tenere oltre la marca del 50% (sopra il punto medio per un climax di vendita, sotto per uno di acquisto). Un test che non recupera metà del range del climax è debole e spesso precede una seconda gamba.</li>
  <li><b>Il volume relativo batte il volume grezzo.</b> "Alto" e "basso" non significano nulla senza contesto. Usa una lettura di volume relativo (RVOL) contro la media dello stesso orario del giorno: una barra di no-supply con RVOL sotto 0,5 (meno della metà della partecipazione usuale di quell'orario) è molto più affidabile che giudicare l'istogramma a occhio, distorto dal sorriso naturale di volume della sessione.</li>
  <li><b>La posizione della chiusura è l'intero messaggio.</b> Su qualsiasi barra climatica o ampia, ignora il massimo e il minimo per un istante e chiedi solo: dove, nel range della barra, ha chiuso? Terzo superiore, ha vinto la domanda. Terzo inferiore, ha vinto l'offerta. Mezzo, la battaglia è irrisolta e aspetti. La chiusura è il pixel più denso di informazione sul grafico.</li>
  <li><b>Attenzione alla trappola della sessione morta.</b> Il basso volume nei periodi strutturalmente morti, la calma del pranzo, gli ultimi venerdì estivi, le ore attorno a una festività, è <i>rumore</i>, non un segnale di no-supply. La stessa barra stretta a basso volume significa "lo smart money sta testando" nelle ore attive e "non c'è nessuno" alle 12:30 di un venerdì di agosto. Pesa sempre il segnale in base a se la sessione dovrebbe essere attiva.</li>
  <li><b>Impila i timeframe, non mischiarli mai.</b> Leggi la fase sul giornaliero o 4 ore e prendi il segnale sul 15 o 5 minuti. Il timeframe maggiore è il tuo filtro (solo long in markup del TF maggiore, solo short in markdown); il minore è il tuo grilletto. I trader che provano a fare entrambi i lavori su un grafico vengono sballottati da segnali che contraddicono la fase maggiore.</li>
</ol>

<p>Nessuno di questi è segreto nel senso di essere nascosto, sono segreti nel senso che quasi nessuno li applica con disciplina. Il vantaggio non è sapere la regola; è seguirla al quattrocentesimo trade, quando sei stanco, il setup è allettante e una delle sette condizioni manca.</p>`,
faq4: `<p class="faq-q">Qual è la differenza tra VPA e VSA (Volume Spread Analysis)?</p>
<p class="faq-a">Sono essenzialmente lo stesso corpo di conoscenza con etichette di lignaggio diverse. VSA è il sistema con marchio di Tom Williams focalizzato sulla relazione spread-chiusura-volume; VPA è l'inquadramento più ampio e accessibile reso popolare da Anna Coulling che tiene prezzo e volume esplicitamente insieme. Il vocabolario (no-demand, no-supply, test, climax) è condiviso. Se impari uno, hai imparato l'altro.</p>

<p class="faq-q">Il VPA funziona sulle crypto?</p>
<p class="faq-a">Parzialmente, e con cautela. Su una venue dominante unica (es. futures BTC sul CME, o una coppia top su un exchange grande) il volume è abbastanza onesto per leggere climax e test. Ma il volume totale crypto è frammentato tra decine di exchange, molto con wash trading su venue minori, quindi il "volume" aggregato può essere inaffidabile. Resta sullo strumento più liquido sulla venue più reputata e tratta le letture come leggermente più rumorose che sui futures regolamentati.</p>

<p class="faq-q">Il VPA può essere automatizzato o codificato in un indicatore?</p>
<p class="faq-a">Le parti meccaniche sì, volume relativo, misurazione dello spread, posizione della chiusura e flag semplici di no-demand/no-supply sono codificabili, e molte piattaforme offrono indicatori stile VSA. Ma il giudizio di maggior valore (in quale fase è il mercato, se la sessione è strutturalmente attiva, se un livello conta) beneficia ancora di una lettura umana. Usa il codice per segnalare candidati; usa gli occhi per confermare fase e contesto prima di agire.</p>

<p class="faq-q">Qual è il motivo più comune per cui i trader di VPA perdono denaro?</p>
<p class="faq-a">Operare il segnale giusto nella fase sbagliata. Una barra di no-supply è un acquisto perfetto in markup e una trappola in distribuzione; la barra sembra identica, solo la fase differisce. I trader che falliscono quasi sempre hanno saltato la disciplina di identificare la fase del timeframe maggiore prima di agire su un segnale del minore. Prima la fase, poi il segnale, ogni volta.</p>`,
conclusion: `<p>Nota quanto poco questa guida ha riguardato la previsione. Il VPA non prevede; legge. Ti dice, al presente, chi sta vincendo ogni barra, se lo sforzo sta producendo un risultato e in quale fase è il mercato. Il "vantaggio" non è una sfera di cristallo, è il rifiuto di farsi ingannare da movimenti di prezzo senza partecipazione dietro, e la volontà di agire contro la propria emozione proprio nei momenti in cui la folla è più certa. È un'affermazione più piccola e umile di quella della maggior parte dei sistemi, ed è precisamente per questo che sopravvive dove loro no.</p>

<p>Se prendi una cosa da questa guida, prendi la domanda che sta sotto l'intero metodo: <i>c'è sforzo reale dietro questo movimento, e sta producendo un risultato reale?</i> Falla a ogni barra significativa, su ogni grafico, in ogni mercato. Quando la risposta è sì, fidati del movimento. Quando sforzo e risultato discordano, qualcuno di grande si nasconde, e ora sai come vederlo.</p>

<div class="deep">
<h4>La tua prima settimana con il VPA</h4>
<p><b>Giorni 1–2:</b> Aggiungi un istogramma di volume al grafico e rimuovi ogni altro indicatore. Passa due sessioni facendo nient'altro che nominare barre ad alta voce, range ampio rialzista, no-demand, no-supply, climax, senza operare.</p>
<p><b>Giorni 3–4:</b> Sul grafico giornaliero di ES o NQ, marca la fase attuale (accumulazione, markup, distribuzione, markdown). Scrivi in quale direzione hai il permesso di operare in quella fase, e non operare in nessun'altra.</p>
<p><b>Giorni 5–7:</b> Solo in simulazione, prendi il setup di pullback no-supply, e solo quello, su un grafico a 5 minuti, ma solo nella direzione che la fase del giornaliero permette. Registra uno screenshot di ogni ingresso. Non rischiare un centesimo di capitale reale finché non hai cinquanta trade simulati registrati e un win rate documentato.</p>
</div>`,
};
