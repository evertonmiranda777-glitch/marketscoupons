export const B = {
toc: {
  lineage: '<li><a href="#lineage">La lignée, de Wyckoff à Coulling</a></li>',
  analogies: '<li><a href="#analogies">Trois analogies qui font cliquer le VPA</a></li>',
  psych: '<li><a href="#psych">Pourquoi la foule a toujours tort aux extrêmes</a></li>',
  walkthrough: "<li><a href=\"#walkthrough\">Lecture d'une séance barre par barre</a></li>",
  cases: '<li><a href="#cases">Trois cas réels, 2008, 2020, 2000</a></li>',
  myths: '<li><a href="#myths">Cinq mythes sur le volume, démontés</a></li>',
  manage: '<li><a href="#manage">Gérer le trade + le journal</a></li>',
  hacks: '<li><a href="#hacks">Sept astuces avancées de VPA</a></li>',
},
lead2: `<p>Ce qui suit est la méthode complète, pas un avant-goût : les trois lois qui sous-tendent tout, les formes de barres exactes qui portent le signal, les patterns de no-supply et de climax qui marquent les retournements avant qu'ils n'arrivent, le cycle en quatre phases qui dit quelle tactique est même permise, trois setups à forte probabilité avec entrées et stops mécaniques, une lecture barre par barre d'une séance, trois cas de 2000 à 2020, sept raffinements avancés et la discipline de risque qui maintient un compte de prop firm en vie assez longtemps pour que l'avantage paie. Lisez-le une fois pour la carte ; revenez-y comme référence pour le reste de votre vie de trader.</p>`,
lineage: `<h2 id="lineage">La Lignée, Du Ruban du Ticker à l'Écran</h2>

<p>Pour faire confiance à une méthode, vous devez savoir d'où elle vient et pourquoi elle a survécu. Le VPA n'est pas une invention des années 2010 habillée de jargon moderne ; c'est le descendant direct de la façon dont les opérateurs les plus performants du début du XXe siècle lisaient réellement le marché, affiné à travers trois générations de praticiens, chacun ajoutant une couche sans casser la fondation.</p>

<p>Cela commence avec <b>Richard Wyckoff</b> (1873–1934). Il a débuté comme coursier en bourse à quinze ans et, dans la vingtaine, dirigeait déjà sa propre maison de courtage. Crucialement, il avait un accès que le reste d'entre nous n'aura jamais : il s'est assis et a interrogé les opérateurs dominants de son époque, parmi eux Jesse Livermore et le cercle de J.P. Morgan, et a fait la rétro-ingénierie de leur comportement en principes enseignables. Wyckoff publiait une lettre de marché lue par des centaines de milliers de personnes et a fondé une école dont le cours est encore enseigné. Son intuition était que le marché pouvait être compris comme la campagne délibérée d'un seul grand opérateur, et que les empreintes de cet opérateur étaient visibles dans la relation entre prix et volume sur le ruban. Les trois lois, offre/demande, effort/résultat, cause/effet, sont les siennes.</p>

<p>La deuxième couche est <b>Tom Williams</b> (1934–2016), et c'est là que le VPA comme méthode nommée s'est cristallisé. Williams n'était pas un universitaire ; il a passé environ quinze ans comme trader de syndicat dans les années 60 et 70, littéralement du côté institutionnel du marché, membre d'un groupe qui accumulait et distribuait de grosses positions. Il a observé, de l'intérieur, comment l'opérateur cache son intention et où le volume le trahit malgré tout. En se retirant de ce monde, il a entrepris de coder ce qu'il avait vu en un système utilisable par un trader sur écran (devenu le VSA, Volume Spread Analysis). Sa contribution fut le vocabulaire précis barre par barre : no-demand, no-supply, l'up-thrust, le test, et le focus implacable sur la relation entre le spread d'une barre, sa clôture et le volume en dessous.</p>

<p>La troisième couche, et la raison pour laquelle un trader particulier autodidacte peut apprendre tout cela, est <b>Anna Coulling</b>. Son livre <i>A Complete Guide to Volume Price Analysis</i> a pris le dialecte institutionnel de Williams et le cadre centenaire de Wyckoff et les a réécrits en langage moderne et simple pour le trader individuel avec un ordinateur portable et un flux de données. Elle a forgé le cadrage accessible « VPA », l'a appliqué au forex, aux futures, aux actions et aux matières premières, et, surtout, a insisté pour que volume et prix soient toujours lus ensemble, jamais séparément. La majeure partie de la compréhension retail moderne du volume vient directement de sa traduction.</p>

<p>Pourquoi un cadre construit sur un ruban de papier fonctionne-t-il encore sur un graphique NQ de 5 minutes en 2026 ? Parce que rien de tout cela ne dépend de la technologie. Cela dépend de deux choses qui n'ont pas changé et ne changeront pas : les grands participants ne peuvent toujours pas bouger de la taille sans laisser une signature de volume, et les foules humaines atteignent toujours le maximum de peur et d'avidité exactement aux mauvais moments. Le médium a évolué du ruban à l'écran à l'algorithme ; le comportement en dessous est identique. C'est la différence entre une méthode et une mode.</p>`,
analogies: `<h2 id="analogies">Trois Analogies qui Font Cliquer le VPA</h2>

<p>Les principes abstraits s'ancrent quand ils s'attachent à quelque chose de physique. Ces trois analogies sont celles qui allument l'ampoule pour la plupart des traders.</p>

<p><b>Le bookmaker.</b> Pensez à l'opérateur comme à un bookmaker, pas à un parieur. Le bookmaker ne parie pas sur le résultat ; il gère le flux d'argent des deux côtés et profite du spread et d'être positionné contre le public quand le public a tort. Le volume est le carnet du bookmaker, il vous dit où l'argent du public s'accumule, ce qui est précisément le côté que le bookmaker fade discrètement. Quand vous lisez un climax d'achat, vous regardez le public charger un côté pendant que le bookmaker prend l'autre.</p>

<p><b>Des empreintes dans la neige.</b> Un gros animal ne peut traverser un champ enneigé sans laisser de traces, aussi prudent soit-il. L'opérateur est le gros animal ; le volume est la neige. Il peut déguiser la direction, fractionner les ordres et travailler discrètement, mais la taille de ce qu'il doit transiger laisse une trace dans le volume qu'un œil entraîné peut suivre. Le prix dit que l'animal est passé ; le volume dit à quel point il était lourd et où il allait vraiment.</p>

<p><b>La salle des ventes.</b> Un marché est une enchère continue à double sens. Le prix est le bid-ask actuel ; le volume est le nombre de lots qui changent réellement de mains à chaque niveau. Un prix qui monte sur un volume mince est un commissaire-priseur criant des chiffres plus élevés dans une salle vide, aucun acheteur réel, juste du bruit. Un prix qui monte sur un volume lourd est une salle pleine de palettes en compétition. Le même chiffre au tableau signifie des choses opposées selon combien enchérissent réellement, et seul le volume vous le dit.</p>

<p>Gardez ces trois à l'esprit et les barres cessent de ressembler à des formes aléatoires. Vous commencez à voir la position du bookmaker, la taille de l'animal et à quel point la salle est pleine, sur chaque barre.</p>`,
nosupply: `<div class="deep">
<h4>Ce que c'est</h4>
<p>Une barre de no-supply est une barre baissière étroite dont le volume est inférieur à celui des deux barres précédentes, le marché a sondé plus bas et n'a trouvé aucun vendeur. La barre de no-demand est son miroir sur les sommets.</p>
<h4>Comment ça marche</h4>
<p>Le prix fait un nouveau plus-bas (ou plus-haut) marginal, mais le volume qui devrait accompagner une vente (ou un achat) authentique n'est tout simplement pas là. L'absence de participation est le signal, elle dit que le côté qui menait le mouvement a quitté l'enchère en silence.</p>
<h4>Pourquoi ça marche</h4>
<p>Une tendance a besoin de carburant continu. Quand l'opérateur finit d'accumuler, il cesse d'acheter et exécute un test : une petite sonde plus bas pour confirmer que la vente retail s'est épuisée. Un volume faible sur cette sonde est la confirmation de l'opérateur lui-même, et vous la lisez par-dessus son épaule.</p>
<h4>Comment l'appliquer</h4>
<p>Marquez d'abord la phase (n'agissez sur le no-supply qu'en accumulation ou markup). Puis exigez un volume sous les deux barres précédentes, entrez à la clôture de la barre et placez le stop quelques ticks au-delà de son extrême.</p>
<h4>L'erreur courante</h4>
<p>Agir sur un no-supply dans la mauvaise phase. En distribution, une barre baissière à faible volume n'est pas un signal d'achat, c'est le calme avant le markdown. Le contexte de phase est tout.</p>
<h4>Le raccourci</h4>
<p>Associez-le à un niveau de support connu ou au VWAP. Un test de no-supply qui tombe exactement sur un nœud de fort volume antérieur a deux raisons indépendantes de tenir, et le taux de réussite grimpe nettement.</p>
<h4>Le secret</h4>
<p>Les barres de no-supply les plus puissantes arrivent <i>après</i> un shakeout (un spring). Le marché piège les vendeurs sous le support, et le test qui revisite la zone en no-supply est l'achat à plus forte probabilité que la méthode offre.</p>
<h4>L'exemple réel</h4>
<p>Le plus-bas du S&amp;P du 6 mars 2009 (666) fut un nouveau plus-bas marginal sur volume en effondrement, une confirmation classique de no-supply du climax de vente d'octobre 2008, des semaines avant que la tendance ne s'inverse vraiment.</p>
<h4>Le scénario idéal</h4>
<p>Une tendance haussière confirmée (markup) qui retrace vers une moyenne mobile ou un niveau de cassure antérieur, imprimant une barre baissière étroite avec un volume qui rétrécit visiblement. Clarté maximale, risque minimal.</p>
<h4>Le scénario erroné</h4>
<p>Un range latéral sans direction et sans phase établie. Les barres de no-supply impriment en permanence dans le chop et ne signifient rien, il n'y a pas d'opérateur exécutant un test, juste une faible participation générale.</p>
</div>`,
climax: `<div class="deep">
<h4>Ce que c'est</h4>
<p>Un climax est l'unique barre où une émotion atteint son pic : la barre la plus large du mouvement, sur le plus fort volume depuis des semaines, qui clôture bien loin de son extrême, cette clôture-loin-de-l'extrême est l'empreinte de l'absorption.</p>
<h4>Comment ça marche</h4>
<p>La foule atteint le maximum de peur (creux) ou d'avidité (sommet) et transige dans une frénésie. L'opérateur composite prend tout l'autre côté à grande échelle. Le volume énorme est l'émotion de la foule ; la clôture rejetée est l'absorption de l'opérateur.</p>
<h4>Pourquoi ça marche</h4>
<p>Les marchés tournent au point de participation maximale du mauvais côté, car une fois que tous ceux qui allaient paniquer (ou poursuivre) ont agi, il ne reste personne pour continuer le mouvement. Le climax est cet épuisement rendu visible dans le volume.</p>
<h4>Comment l'appliquer</h4>
<p>N'opérez jamais la barre de climax elle-même. Attendez le test : une barre suivante qui tient au-delà de l'extrême du climax (un plus-bas plus haut après un climax de vente) sur un volume bien sous le climax. Entrez sur le test, stop au-delà de l'extrême du climax.</p>
<h4>L'erreur courante</h4>
<p>Attraper le couteau qui tombe, acheter la barre de climax en temps réel. Sans le test, vous n'avez aucune confirmation que l'absorption a tenu, et une deuxième jambe de climax peut vous sortir.</p>
<h4>Le raccourci</h4>
<p>Utilisez la règle des 50 % : le test valide doit récupérer plus de la moitié du range de la barre de climax. S'il n'y parvient pas, l'absorption était faible et un plus-bas plus bas est probable.</p>
<h4>Le secret</h4>
<p>La barre de volume la plus grosse et la plus terrifiante est celle sur laquelle agir, pas à éviter. L'instinct du retail de fuir la barre la plus effrayante est exactement pourquoi l'opérateur peut y remplir. Votre avantage est de faire l'opposé de votre instinct.</p>
<h4>L'exemple réel</h4>
<p>10 octobre 2008 (climax de vente, volume record, clôture au-dessus du plus-bas) et 10 mars 2000 (climax d'achat sur le Nasdaq, volume record, clôture rejetée) sont les deux cas canoniques, directions opposées, empreinte identique.</p>
<h4>Le scénario idéal</h4>
<p>Une tendance étendue et épuisée entrant dans un niveau majeur, puis une barre de volume démesuré qui clôture fort contre la tendance. Épuisement maximal, signal maximal.</p>
<h4>Le scénario erroné</h4>
<p>Une barre de fort volume au milieu d'une tendance saine qui clôture <i>dans le sens</i> de la tendance. Ce n'est pas un climax, c'est de la force. Le climax exige la clôture rejetée.</p>
</div>`,
psych: `<h2 id="psych">Pourquoi la Foule a Toujours Tort aux Extrêmes</h2>

<p>Le VPA fonctionne en raison d'une vérité structurelle sur la façon dont les marchés sont construits, pas d'une astuce. Comprendre le <i>pourquoi</i> à ce niveau est ce qui vous permet de tenir une position qui semble insensée, acheter la barre la plus terrifiante d'un krach, avec conviction plutôt qu'avec espoir.</p>

<p>Partez d'un simple fait comptable : pour que le marché fasse un creux majeur, le nombre maximal de personnes doit déjà être positionné vendeur ou en liquidités. Si la majorité était encore haussière, il y aurait davantage de vente à venir et le creux ne tiendrait pas. Donc un creux durable <i>exige</i> un pessimisme maximal, ce n'est pas une coïncidence que les creux semblent affreux, c'est une nécessité structurelle. La même logique s'inverse aux sommets : un sommet exige que presque tous ceux qui pouvaient acheter l'aient déjà fait, c'est pourquoi les sommets semblent euphoriques et évidents. L'émotion n'est pas du bruit autour du retournement ; l'émotion <b>est</b> le retournement.</p>

<p>Ajoutez maintenant l'opérateur. Un participant qui doit acheter une très grosse position a un problème : son propre achat pousse le prix contre lui, augmentant son coût moyen. Le seul endroit où il remplit de la taille à bon marché est dans une vente lourde, dans la panique exacte que produit le pessimisme maximal. Donc l'opérateur est structurellement forcé d'être acheteur quand la foule est la plus désespérée de vendre, et vendeur quand la foule est la plus désespérée d'acheter. Il n'est pas plus intelligent sur la nouvelle ; il est positionné à l'opposé de l'émotion parce que c'est la seule façon de transiger de la taille. Le volume est le reçu de cette transaction.</p>

<p>C'est pourquoi la barre de climax a sa forme spécifique. Le volume énorme est la foule qui capitule ; la clôture qui rejette l'extrême est l'opérateur qui l'absorbe. Vous ne prédisez pas l'avenir en lisant un climax de vente, vous lisez, en temps réel, le moment où le gros acheteur a submergé la panique. La « prédiction » est simplement la reconnaissance qu'une fois que le nombre maximal de vendeurs a vendu, le chemin de moindre résistance s'inverse.</p>

<p>La conséquence pratique est inconfortable mais libératrice : <b>votre instinct se trompera à chaque retournement important, et c'est le signal.</b> Quand une barre vous donne envie de fuir, cette peur est partagée par toute la foule, ce qui signifie que la vente culmine, ce qui signifie que l'opérateur remplit. La discipline du VPA est, en grande partie, la discipline d'agir contre votre propre lecture émotionnelle du graphique et de faire confiance au volume. Le trader qui intériorise cela cesse d'avoir besoin de courage aux retournements, il lit simplement le reçu et agit.</p>`,
spring: `<div class="deep">
<h4>Ce que c'est</h4>
<p>Un spring est une fausse cassure sous le support d'un range d'accumulation qui s'inverse immédiatement vers l'intérieur, piégeant les vendeurs qui l'ont cassée. L'événement traçable est le <i>test</i> à faible volume du spring, pas la barre du spring elle-même.</p>
<h4>Comment ça marche</h4>
<p>L'opérateur provoque (ou exploite simplement) une plongée sous un support évident. Les stops de ceux qui ont acheté le range se déclenchent et les shorts de cassure entrent, les deux deviennent des acheteurs futurs forcés. Le prix revient dans le range sur fort volume, et une sonde ultérieure à faible volume vers le plus-bas du spring confirme qu'il ne reste aucun vendeur.</p>
<h4>Pourquoi ça marche</h4>
<p>C'est construit sur les stops d'autres traders. Chaque short piégé doit finalement acheter pour se couvrir, fournissant un carburant intégré au markup. Le spring convertit les ordres de protection de la foule en rampe de lancement de l'opérateur.</p>
<h4>Comment l'appliquer</h4>
<p>Identifiez un support horizontal clair avec plusieurs touches. Sur une cassure baissière qui ne tient qu'une ou deux barres et s'inverse, attendez le test : un retour vers la zone du spring sur un volume bien sous la barre du spring, sans nouveau plus-bas. Entrez à la clôture du test, stop sous le plus-bas du spring.</p>
<h4>L'erreur courante</h4>
<p>Vendre la cassure initiale sous le support, exactement le piège que le spring est conçu pour tendre. Si le support casse sur volume <i>faible</i> et revient, c'est un spring, pas un breakdown.</p>
<h4>Le raccourci</h4>
<p>Un spring authentique a généralement plus de volume sur la barre du shakeout que sur le test. Si le volume du test n'est pas visiblement inférieur à celui du spring, méfiez-vous.</p>
<h4>Le secret</h4>
<p>Les meilleurs springs surviennent après un range d'accumulation long et morne, plus le support est évident et défini, plus il y a de stops en dessous, et plus le piège libère de carburant.</p>
<h4>L'exemple réel</h4>
<p>Les springs sont les plus visibles sur des séances individuelles de futures ; en journalier, beaucoup de plus-bas majeurs (y compris des nouveaux plus-bas marginaux qui s'inversent instantanément sur volume rétrécissant) sont des springs du range précédent.</p>
<h4>Le scénario idéal</h4>
<p>Un range de plusieurs semaines avec support net, un coup brusque en dessous sur un pic de nouvelle, une reprise immédiate, puis un test tranquille des jours plus tard qui tient au-dessus du plus-bas du spring.</p>
<h4>Le scénario erroné</h4>
<p>Une cassure sous le support sur volume croissant et soutenu qui continue de clôturer plus bas. C'est un vrai breakdown (markdown), pas un spring, ne le fadez pas.</p>
</div>`,
walkthrough: `<h2 id="walkthrough">Lecture d'une Séance Barre par Barre</h2>

<p>La théorie ne devient instinct que lorsque vous la voyez se dérouler en séquence. Voici comment un trader de VPA discipliné lit une séance représentative sur l'ES, pas une séance réelle datée, mais un composite des patterns qui se répètent presque quotidiennement. Suivez la logique, pas les chiffres.</p>

<p><b>Pré-marché.</b> Avant l'ouverture, le trader marque la phase du timeframe supérieur sur le graphique journalier : l'ES est en markup stable depuis trois semaines, retraçant poliment vers sa moyenne montante à chaque fois. Le biais du jour est donc <i>achats sur la faiblesse</i>, jamais ventes, la phase d'abord.</p>

<p><b>L'ouverture.</b> Les quinze premières minutes sont violentes et à fort volume, comme toujours. Le trader ne fait rien. Le volume d'ouverture est mécanique, des fonds exécutant des ordres à la cloche, et porte peu d'information directionnelle. Lire effort-vs-résultat ici est du bruit ; l'enchère ne s'est pas stabilisée.</p>

<p><b>Pullback de mi-matinée.</b> Vers 10h30 l'indice dérive à la baisse vers sa moyenne mobile montante. Le trader observe les barres baissières : la première est large sur volume décent (vente réelle), mais les deux suivantes se rétrécissent et leur volume rétrécit visiblement sous les barres précédentes. C'est la séquence de no-supply, des vendeurs s'épuisant sur le support, dans un markup établi. C'est le setup que la journée attendait.</p>

<p><b>L'entrée.</b> Une barre baissière étroite imprime avec un volume nettement sous les deux barres précédentes et clôture à mi-range, refusant de faire un nouveau plus-bas significatif. Le trader entre à sa clôture, stop quelques ticks sous le plus-bas. Le risque est petit parce que la barre est petite, le cadeau structurel du VPA.</p>

<p><b>Le maintien.</b> Le prix monte. Les barres haussières montrent maintenant un volume en expansion et clôturent près de leurs plus-hauts, demande saine confirmant la lecture. Le trader tient, réalise un tiers au plus-haut du swing précédent et déplace le stop à breakeven. Le risque est maintenant nul ; le reste est l'argent de la maison.</p>

<p><b>L'avertissement.</b> En début d'après-midi, le prix se traîne vers un nouveau plus-haut marginal, mais la barre est étroite et son volume est le plus faible en une douzaine de barres. No-demand. Les acheteurs qui ont porté le mouvement ont cessé de se présenter. Le trader ne vend pas en panique toute la position, mais resserre le stop suiveur sous le dernier plus-bas plus haut, car le carburant est parti.</p>

<p><b>La sortie.</b> Deux barres plus tard, une barre baissière plus large enlève ce stop suiveur. Le trader est sorti, ayant capturé le gros de la jambe de markup et étant sorti au moment où le volume a dit que la demande était partie. Pas de prédiction, pas d'opinion, pas de nouvelle, juste une séquence de lectures de volume, chacune une petite décision répétable. Voilà à quoi ressemble vraiment une séance de VPA : surtout de l'attente, quelques lectures précises, et des sorties guidées par la disparition du côté qui vous payait.</p>`,
cases: `<h2 id="cases">Trois Cas Réels, La Même Empreinte, à Trois Décennies d'Intervalle</h2>

<p>Les patterns que vous ne voyez que dans les livres semblent abstraits. Les patterns que vous voyez se répéter dans les plus grands événements de marché des vingt-cinq dernières années semblent inévitables. Voici trois points de retournement que chaque principe de VPA de ce guide a prédit en temps réel, pas avec du recul, mais avec la signature de volume exacte que nous avons décrite. Les dates et chiffres sont du domaine public ; ouvrez-les sur n'importe quel graphique et lisez le volume vous-même.</p>

<div class="story">
<h4>Cas 1, Le Climax de Vente d'Octobre 2008 (S&amp;P 500)</h4>
<p>L'effondrement de Lehman Brothers le 15 septembre 2008 a déclenché une cascade. Dans les semaines suivantes, le S&amp;P 500 a chuté sans relâche, et le <b>10 octobre 2008</b> il a imprimé un climax de vente de proportions historiques : un range intraday d'environ 100 points, le plus fort volume hebdomadaire que l'indice ait jamais enregistré jusque-là, et une clôture qui s'est élevée dramatiquement au-dessus du plus-bas de la séance. Cette clôture-au-dessus-du-plus-bas est l'empreinte de l'absorption, quelqu'un d'énorme achetait chaque action que la panique jetait. Le VIX, la jauge de peur, a bondi vers 70 et atteindrait un intraday de 89,53 le 24 octobre. Un lecteur de VPA n'avait pas besoin d'appeler le creux exact ; il avait besoin de reconnaître qu'un effort maximal (volume record) avait produit un résultat raté (une clôture bien au-dessus du plus-bas), et que c'est la signature classique de la capitulation. Le marché a oscillé violemment pendant des mois, mais le climax a marqué le moment où l'offre s'est épuisée. Le vrai creux est arrivé le 6 mars 2009 à S&amp;P 666, sur un test tranquille et à faible volume qui a fait un nouveau plus-bas marginal pendant que le volume se tarissait, la confirmation classique de no-supply. Effort, résultat, absorption, test : tout le vocabulaire, écrit le long du pire krach en quatre-vingts ans.</p>
</div>

<div class="story">
<h4>Cas 2, La Capitulation du COVID en Mars 2020 (S&amp;P 500)</h4>
<p>Le bear market le plus rapide de l'histoire : le S&amp;P 500 a chuté d'environ 34 % en seulement 23 séances, du plus-haut du 19 février 2020 au plus-bas du 23 mars 2020 à 2 191. La semaine du 16–20 mars a produit un volume colossal et un VIX qui a clôturé à 82,69 le 16 mars, des lectures qui rivalisent ou dépassent 2008. La barre de capitulation du 23 mars avait la forme désormais familière : volume énorme, range large, et une clôture qui a refusé de rester au plus-bas. L'opérateur composite accumulait dans les titres les plus effrayants d'une génération. Ce qui rend ce cas instructif, c'est la vitesse : toute la phase d'accumulation qui a pris des mois en 2008–09 a été comprimée en jours en 2020, parce que la cause (le choc COVID) était soudaine plutôt que structurelle. Même empreinte, horloge différente. Un trader lisant le volume plutôt que les titres a vu effort-sans-résultat-baissier au moment exact où la foule était la plus certaine que le monde s'achevait.</p>
</div>

<div class="story">
<h4>Cas 3, Le Climax d'Achat de Mars 2000 (Nasdaq Composite)</h4>
<p>Les climax fonctionnent dans les deux sens, et le sommet des dot-com est le climax d'achat le plus propre de l'ère moderne. Le Nasdaq Composite a atteint le pic intraday de 5 048,62 le <b>10 mars 2000</b> après une ascension quasi verticale, sur le volume le plus lourd que l'indice ait jamais vu, le blow-off. L'euphorie retail était totale ; tout le monde « savait » que la nouvelle économie avait abrogé les anciennes règles. Ce volume record avec une clôture stagnante et rejetée était l'empreinte de la distribution : l'opérateur composite déchargeait son inventaire dans la dernière vague de demande frénétique. L'indice ne reverrait pas ce niveau avant quinze ans. La leçon est identique à celle du climax de vente, inversée : la barre qui semblait la plus excitante, celle qui criait « ça casse enfin pour de bon », fut le moment précis où le smart money a remis sa position à la foule. Avidité maximale, volume maximal, continuation ratée.</p>
</div>

<p>Trois événements, trois décennies, deux directions, une empreinte. Les instruments ont changé, les titres ont changé, la vitesse a changé. La signature dans le volume, non. Cette répétabilité est pourquoi un cadre centenaire fonctionne encore : ce n'est pas de l'appariement de patterns sur des formes de prix, qui mutent, mais sur le comportement humain aux extrêmes, qui ne mute pas.</p>`,
instruments: `<p>Un peu plus de profondeur sur chacun, car le même signal de VPA se comporte différemment selon la microstructure de l'instrument :</p>

<p><b>ES (futures S&amp;P 500)</b> est l'instrument de VPA du connaisseur. Sa profondeur fait que les climax et les tests de no-supply impriment avec une clarté inhabituelle, et les faux signaux sont plus rares car bouger l'ES exige une taille authentique. Le compromis est que la séance de mi-journée peut se comprimer en un range étroit à faible volume où chaque barre ressemble à un no-supply et aucune ne l'est, le piège de la séance morte dans sa forme la plus pure. Tradez l'ouverture et l'après-midi ; respectez le calme du déjeuner.</p>

<p><b>NQ (futures Nasdaq 100)</b> bouge plus vite et plus large que l'ES sur la même nouvelle, ce qui rend ses climax plus dramatiques mais ses stops doivent être plus larges. La signature de volume est tout aussi lisible, mais la vélocité punit l'hésitation, un test de no-supply sur NQ se résout en moins de barres, donc votre entrée doit être mécanique. Les débutants font souvent mieux d'apprendre les patterns sur l'ES d'abord, puis de passer au NQ quand les lectures sont automatiques.</p>

<p><b>CL (futures pétrole)</b> donne les pics de climax les plus violents des quatre, ce qui rend ses retournements dramatiques et rentables, mais il fait des faux mouvements violents autour du rapport hebdomadaire des stocks EIA (mercredis, 10h30 ET) et des titres mensuels de l'OPEP. La discipline ici est la conscience du calendrier : restez à l'écart pendant le rapport, puis lisez le volume quand l'enchère se normalise. CL récompense la patience et punit quiconque trade le volume pendant un choc programmé.</p>

<p><b>GC (futures or)</b> montre des ranges d'accumulation magnifiquement propres car l'or passe de longues périodes en équilibre, construisant de la cause avant une libération. Sa faiblesse est la séance asiatique mince, où une poignée de contrats bouge le prix et le signal de volume devient peu fiable. Lisez GC pendant Londres et les États-Unis ; traitez les barres asiatiques nocturnes comme de faible confiance.</p>`,
myths: `<h2 id="myths">Cinq Mythes sur le Volume, Démontés</h2>

<p>Le mauvais folklore du volume est partout, et la plupart nuit activement aux traders. Clarifier ces cinq idées fausses vaut autant qu'apprendre les setups.</p>

<p><b>Mythe 1, « Le volume confirme la tendance. »</b> À moitié vrai et dangereusement incomplet. Le volume confirme un mouvement seulement quand effort et résultat concordent. Un prix qui monte sur volume croissant avec des clôtures près des plus-hauts confirme ; un prix qui monte sur volume croissant avec des clôtures à mi-range (absorption) avertit d'un retournement. « Le volume confirme la direction » sans lire la clôture, c'est ainsi que les traders achètent le sommet exact.</p>

<p><b>Mythe 2, « Un fort volume est haussier. »</b> Le volume n'a aucune direction intrinsèque. La même barre de volume énorme est un climax d'achat (baissier) sur un sommet et un climax de vente (haussier) sur un creux. Le volume mesure l'intensité de la participation, pas sa direction, la clôture et la phase vous donnent la direction.</p>

<p><b>Mythe 3, « Il faut le Level 2 / le carnet d'ordres pour lire le volume. »</b> Le carnet montre les ordres au repos (intentions), qui peuvent être spoofés et retirés. Le volume négocié montre ce qui s'est réellement exécuté (engagement), qui ne peut être falsifié. Le VPA sur un simple graphique prix + volume lit l'engagement, le plus honnête des deux. Le Level 2 est un complément utile, pas un prérequis.</p>

<p><b>Mythe 4, « Les indicateurs de volume (OBV, etc.) remplacent la lecture des barres. »</b> Les indicateurs de volume cumulé lissent précisément l'information la plus importante : la relation entre le spread, la clôture et le volume de cette barre. Ce sont des résumés, et les résumés cachent le climax et le test de no-supply, précisément les barres que vous tradez. Utilisez-les pour le contexte de divergence, jamais comme substitut à la lecture de la barre.</p>

<p><b>Mythe 5, « Le volume ne compte pas dans les marchés 24h ou dominés par les algos. »</b> Les algorithmes sont les plus grands participants de tous, et eux non plus ne peuvent transiger de la taille sans laisser du volume. Si tant est, l'exécution algorithmique laisse les empreintes les plus propres, car l'accumulation et la distribution programmatiques sont plus systématiques que les humaines. Le médium a changé ; la loi selon laquelle la taille laisse une trace, non.</p>`,
confluence: `<p>Un avertissement sur la confluence : plus d'outils n'est pas plus d'avantage. La tentation, une fois que vous avez VWAP, profile et RVOL à l'écran, est d'attendre qu'ils soient tous d'accord, et le marché vous donne rarement un alignement parfait à cinq facteurs avant de bouger. Le professionnel utilise une ou deux confirmations pour noter un signal de VPA, pas cinq pour le paralyser. La lecture du volume est le moteur ; les outils supplémentaires sont le tableau de bord, utiles pour le contexte mais jamais une raison d'ignorer un test de no-supply propre que le moteur a déjà donné. Si vous vous surprenez à ajouter un sixième indicateur pour vous sentir en sécurité, le problème n'est pas le graphique, c'est que vous n'avez pas encore fait confiance au volume.</p>`,
manage: `<h2 id="manage">Gérer le Trade Après l'Entrée, et le Journal qui Construit l'Avantage</h2>

<p>La plupart du matériel de VPA s'arrête à l'entrée. Mais l'entrée n'est peut-être qu'un tiers du résultat ; ce que vous faites après être rempli, et ce que vous enregistrez ensuite, est d'où vient la consistance.</p>

<h3>Gérer la position</h3>

<p>Une fois dans un trade de VPA, la même logique de volume qui vous a fait entrer gouverne comment vous restez. Après une entrée de pullback no-supply en markup, vous tenez tant que les barres haussières montrent un volume en expansion et que les pullbacks montrent un volume rétrécissant, le rythme sain du markup. Au moment où vous voyez l'inverse (barres haussières sur volume rétrécissant, une barre de no-demand faisant un nouveau plus-haut), la demande qui vous a porté est partie et il est temps de resserrer ou de sortir. Vous ne gérez pas seulement par un objectif fixe ; vous lisez si l'opérateur est encore de votre côté.</p>

<p>Réalisez par paliers sur la structure. Prenez un profit partiel au premier plus-haut de swing précédent (ou au plus-haut de l'auto-rally après un retournement de climax), déplacez le stop à breakeven, et laissez courir le reste contre la structure suiveuse. Le premier objectif paie le trade et retire le risque ; le runner est où apparaît l'asymétrie rendement-risque du VPA. L'erreur de gestion la plus courante est l'inverse, laisser courir toute la position pour un home run et rendre le premier objectif facile quand apparaît la première barre de no-demand.</p>

<p>Respectez l'invalidation de façon absolue. Tout l'avantage des stops serrés du VPA s'évapore si vous les élargissez sur le moment. Si le prix enlève le plus-bas du spring, le plus-bas du climax ou le plus-bas de la barre de no-supply, la lecture était fausse, pas « en avance », fausse. Sortez et relisez. Le marché offrira une autre barre ; un compte brûlé, non.</p>

<h3>Le journal qui compose</h3>

<p>Le VPA est de la reconnaissance de patterns, et la reconnaissance de patterns se construit par répétition délibérée et revue. Un journal basé sur des captures d'écran est l'accélérateur le plus rapide qui soit. Pour chaque trade, capturez le graphique à l'entrée et annotez quatre choses : la phase que vous pensiez être, le signal spécifique (no-supply / test de climax / spring), la lecture de volume qui l'a confirmé et où se situait l'invalidation. Puis, à la clôture du trade, ajoutez une cinquième note : ce qui s'est réellement passé et si votre lecture de phase était correcte.</p>

<p>Revoyez chaque semaine, en triant par résultat. Vous chassez deux choses. D'abord, les setups où votre taux de réussite est véritablement élevé, concentrez-vous là et coupez le reste. Ensuite, la raison récurrente pour laquelle vos perdants échouent ; dans presque tous les journaux de traders la réponse est la même, ils ont pris le bon signal dans la mauvaise phase, ou dans une séance structurellement morte. Nommer la fuite est ce qui la colmate. Un trader avec cent captures annotées lit le volume d'une manière qu'aucune quantité de théorie ne produit, car il a construit la reconnaissance empiriquement, pas intellectuellement.</p>`,
hacks: `<h2 id="hacks">Sept Astuces Avancées de VPA que les Cours Font Payer</h2>

<p>Une fois les fondamentaux automatiques, ces raffinements séparent un lecteur compétent d'un lecteur aiguisé. Chacun est une règle concrète et testable, pas un principe vague, le genre d'avantage qui se compose sur des centaines de trades.</p>

<ol>
  <li><b>La règle des deux barres de volume.</b> Une barre de no-demand ou no-supply ne compte que si son volume est inférieur à celui des <i>deux</i> barres précédentes, pas juste une. Ce seul filtre élimine la majorité des faux signaux, car il confirme une baisse authentique et soutenue de participation plutôt qu'un soubresaut d'une barre.</li>
  <li><b>L'épuisement de la demande a besoin d'une ancre au VWAP.</b> Un test de no-supply qui tient <i>au-dessus</i> du VWAP de séance est dramatiquement plus fort qu'un en dessous. Les institutions qui utilisent le VWAP comme benchmark d'exécution sont, par définition, des acheteuses disposées au-dessus, donc un test à faible volume là a le gros argent de votre côté. Sous le VWAP, vous luttez contre elles.</li>
  <li><b>La règle des 50 % du climax.</b> Après un climax authentique, mesurez le range de la barre de climax. Le premier test valide doit tenir au-delà de la marque des 50 % (au-dessus du milieu pour un climax de vente, en dessous pour un d'achat). Un test qui ne récupère pas la moitié du range du climax est faible et précède souvent une deuxième jambe.</li>
  <li><b>Le volume relatif bat le volume brut.</b> « Élevé » et « faible » ne signifient rien sans contexte. Utilisez une lecture de volume relatif (RVOL) contre la moyenne du même horaire de la journée : une barre de no-supply à RVOL sous 0,5 (moins de la moitié de la participation habituelle de ce créneau) est bien plus fiable que de juger l'histogramme à l'œil, faussé par le sourire naturel de volume de la séance.</li>
  <li><b>La position de la clôture est tout le message.</b> Sur toute barre climatique ou large, ignorez le plus-haut et le plus-bas un instant et demandez seulement : où, dans le range de la barre, a-t-elle clôturé ? Tiers supérieur, la demande a gagné. Tiers inférieur, l'offre a gagné. Milieu, la bataille est non résolue et vous attendez. La clôture est le pixel le plus dense en information du graphique.</li>
  <li><b>Méfiez-vous du piège de la séance morte.</b> Un faible volume durant des périodes structurellement mortes, le calme du déjeuner, les derniers vendredis d'été, les heures autour d'un jour férié, est du <i>bruit</i>, pas un signal de no-supply. La même barre étroite à faible volume signifie « le smart money teste » aux heures actives et « il n'y a personne » à 12h30 un vendredi d'août. Pondérez toujours le signal selon que la séance devrait être active.</li>
  <li><b>Empilez les timeframes, ne les mélangez jamais.</b> Lisez la phase sur le journalier ou 4 heures et prenez le signal sur le 15 ou 5 minutes. Le timeframe supérieur est votre filtre (seulement des longs en markup du TF supérieur, seulement des shorts en markdown) ; l'inférieur est votre déclencheur. Les traders qui essaient de faire les deux tâches sur un seul graphique sont ballottés par des signaux qui contredisent la phase supérieure.</li>
</ol>

<p>Aucune de ces astuces n'est secrète au sens d'être cachée, elles sont secrètes au sens où presque personne ne les applique avec discipline. L'avantage n'est pas de connaître la règle ; c'est de la suivre au quatre-centième trade, quand vous êtes fatigué, que le setup est tentant et qu'une des sept conditions manque.</p>`,
faq4: `<p class="faq-q">Quelle est la différence entre VPA et VSA (Volume Spread Analysis) ?</p>
<p class="faq-a">Ce sont essentiellement le même corps de connaissances avec des étiquettes de lignée différentes. VSA est le système de marque de Tom Williams centré sur la relation spread-clôture-volume ; VPA est le cadrage plus large et accessible popularisé par Anna Coulling qui garde prix et volume explicitement ensemble. Le vocabulaire (no-demand, no-supply, test, climax) est partagé. Si vous apprenez l'un, vous avez appris l'autre.</p>

<p class="faq-q">Le VPA fonctionne-t-il sur la crypto ?</p>
<p class="faq-a">Partiellement, et avec prudence. Sur une venue dominante unique (p. ex. futures BTC sur le CME, ou une paire top sur un grand exchange) le volume est assez honnête pour lire climax et tests. Mais le volume total crypto est fragmenté entre des dizaines d'exchanges, beaucoup avec du wash trading sur des venues mineures, donc le « volume » agrégé peut être peu fiable. Restez sur l'instrument le plus liquide sur la venue la plus réputée et traitez les lectures comme légèrement plus bruitées que sur les futures réglementés.</p>

<p class="faq-q">Le VPA peut-il être automatisé ou codé en indicateur ?</p>
<p class="faq-a">Les parties mécaniques oui, volume relatif, mesure du spread, position de la clôture et flags simples de no-demand/no-supply sont codables, et beaucoup de plateformes proposent des indicateurs type VSA. Mais le jugement de plus grande valeur (dans quelle phase est le marché, si la séance est structurellement active, si un niveau compte) bénéficie encore d'une lecture humaine. Utilisez le code pour signaler des candidats ; utilisez vos yeux pour confirmer phase et contexte avant d'agir.</p>

<p class="faq-q">Quelle est la raison la plus courante pour laquelle les traders de VPA perdent de l'argent ?</p>
<p class="faq-a">Trader le bon signal dans la mauvaise phase. Une barre de no-supply est un achat parfait en markup et un piège en distribution ; la barre semble identique, seule la phase diffère. Les traders qui échouent ont presque toujours sauté la discipline d'identifier la phase du timeframe supérieur avant d'agir sur un signal de l'inférieur. La phase d'abord, le signal ensuite, à chaque fois.</p>`,
conclusion: `<p>Remarquez à quel point ce guide a peu parlé de prédiction. Le VPA ne prévoit pas ; il lit. Il vous dit, au présent, qui gagne chaque barre, si l'effort produit un résultat et dans quelle phase est le marché. L'« avantage » n'est pas une boule de cristal, c'est le refus de se laisser tromper par des mouvements de prix sans participation derrière, et la volonté d'agir contre sa propre émotion précisément aux moments où la foule est la plus certaine. C'est une affirmation plus petite et plus humble que celle de la plupart des systèmes, et c'est précisément pourquoi elle survit là où ils échouent.</p>

<p>Si vous ne retenez qu'une chose de ce guide, retenez la question qui sous-tend toute la méthode : <i>y a-t-il un effort réel derrière ce mouvement, et produit-il un résultat réel ?</i> Posez-la à chaque barre significative, sur chaque graphique, dans chaque marché. Quand la réponse est oui, faites confiance au mouvement. Quand effort et résultat divergent, quelqu'un de grand se cache, et vous savez maintenant comment le voir.</p>

<div class="deep">
<h4>Votre première semaine avec le VPA</h4>
<p><b>Jours 1–2 :</b> Ajoutez un histogramme de volume à votre graphique et retirez tout autre indicateur. Passez deux séances à ne faire que nommer les barres à voix haute, large range haussier, no-demand, no-supply, climax, sans trader.</p>
<p><b>Jours 3–4 :</b> Sur le graphique journalier de l'ES ou du NQ, marquez la phase actuelle (accumulation, markup, distribution, markdown). Écrivez dans quelle direction vous avez le droit de trader dans cette phase, et ne tradez aucune autre.</p>
<p><b>Jours 5–7 :</b> En simulation uniquement, prenez le setup de pullback no-supply, et seulement celui-là, sur un graphique de 5 minutes, mais seulement dans le sens que la phase journalière permet. Enregistrez une capture de chaque entrée. Ne risquez pas un centime de capital réel avant d'avoir cinquante trades simulés enregistrés et un taux de réussite documenté.</p>
</div>`,
};
