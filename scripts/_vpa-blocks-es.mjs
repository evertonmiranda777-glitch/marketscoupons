export const B = {
toc: {
  lineage: '<li><a href="#lineage">El linaje, de Wyckoff a Coulling</a></li>',
  analogies: '<li><a href="#analogies">Tres analogías que hacen clic el VPA</a></li>',
  psych: '<li><a href="#psych">Por qué la multitud siempre se equivoca en los extremos</a></li>',
  walkthrough: '<li><a href="#walkthrough">Lectura de una sesión barra por barra</a></li>',
  cases: '<li><a href="#cases">Tres casos reales, 2008, 2020, 2000</a></li>',
  myths: '<li><a href="#myths">Cinco mitos sobre el volumen, derribados</a></li>',
  manage: '<li><a href="#manage">Gestionar el trade + el diario</a></li>',
  hacks: '<li><a href="#hacks">Siete hacks avanzados de VPA</a></li>',
},
lead2: `<p>Lo que sigue es el método completo, no un adelanto: las tres leyes que sostienen todo, las formas de barra exactas que llevan la señal, los patrones de no-supply y clímax que marcan giros antes de que ocurran, el ciclo de cuatro fases que dice qué táctica está siquiera permitida, tres setups de alta probabilidad con entradas y stops mecánicos, una lectura barra por barra de una sesión, tres casos de 2000 a 2020, siete refinamientos avanzados y la disciplina de riesgo que mantiene viva una cuenta de prop firm el tiempo suficiente para que la ventaja pague. Léelo una vez por el mapa; vuelve a él como referencia el resto de tu vida como trader.</p>`,
lineage: `<h2 id="lineage">El Linaje, De la Cinta del Ticker a la Pantalla</h2>

<p>Para confiar en un método debes saber de dónde viene y por qué sobrevivió. El VPA no es un invento de los años 2010 vestido de jerga moderna; es el descendiente directo de cómo los operadores más exitosos de principios del siglo XX leían realmente el mercado, refinado a lo largo de tres generaciones de practicantes, cada una añadiendo una capa sin romper la base.</p>

<p>Empieza con <b>Richard Wyckoff</b> (1873–1934). Comenzó como recadero de bolsa a los quince años y en sus veinte ya dirigía su propia correduría. Crucialmente, tenía un acceso que el resto nunca tendremos: se sentó y entrevistó a los operadores dominantes de su época, entre ellos Jesse Livermore y el círculo de J.P. Morgan, y aplicó ingeniería inversa a su comportamiento para convertirlo en principios enseñables. Wyckoff publicaba una carta de mercado leída por cientos de miles y fundó una escuela cuyo curso aún se enseña. Su intuición fue que el mercado podía entenderse como la campaña deliberada de un único operador grande, y que las huellas de ese operador eran visibles en la relación entre precio y volumen en la cinta. Las tres leyes, oferta/demanda, esfuerzo/resultado, causa/efecto, son suyas.</p>

<p>La segunda capa es <b>Tom Williams</b> (1934–2016), y aquí es donde el VPA como método con nombre cristalizó. Williams no era académico; pasó unos quince años como trader de sindicato en los años 60 y 70, literalmente del lado institucional del mercado, parte de un grupo que acumulaba y distribuía posiciones grandes. Observó, desde dentro, cómo el operador oculta su intención y dónde el volumen, aun así, lo delata. Al retirarse de ese mundo se propuso codificar lo que había visto en un sistema que un trader de pantalla pudiera usar (que se conoció como VSA, Volume Spread Analysis). Su aporte fue el vocabulario preciso barra por barra: no-demand, no-supply, el up-thrust, el test, y el foco implacable en la relación entre el spread de una barra, su cierre y el volumen debajo.</p>

<p>La tercera capa, y la razón de que un trader minorista autodidacta pueda aprender esto, es <b>Anna Coulling</b>. Su libro <i>A Complete Guide to Volume Price Analysis</i> tomó el dialecto institucional de Williams y el marco centenario de Wyckoff y los reescribió en lenguaje moderno y simple para el trader individual con un portátil y un feed de datos. Acuñó el encuadre accesible "VPA", lo aplicó en forex, futuros, acciones y materias primas, y, lo más importante, insistió en que volumen y precio deben leerse siempre juntos, nunca por separado. La mayor parte del entendimiento minorista moderno del volumen viene directo de su traducción.</p>

<p>¿Por qué un marco construido sobre una cinta de papel sigue funcionando en un gráfico de NQ de 5 minutos en 2026? Porque nada de esto depende de la tecnología. Depende de dos cosas que no han cambiado y no cambiarán: los participantes grandes aún no pueden mover tamaño sin dejar una firma de volumen, y las multitudes humanas aún alcanzan el máximo de miedo y codicia exactamente en los momentos equivocados. El medio evolucionó de cinta a pantalla a algoritmo; el comportamiento debajo es idéntico. Esa es la diferencia entre un método y una moda.</p>`,
analogies: `<h2 id="analogies">Tres Analogías que Hacen Clic el VPA</h2>

<p>Los principios abstractos se fijan cuando se atan a algo físico. Estas tres analogías son las que encienden la bombilla para la mayoría de los traders.</p>

<p><b>El corredor de apuestas (bookmaker).</b> Piensa en el operador como un bookmaker, no como un apostador. El bookmaker no apuesta al resultado; gestiona el flujo de dinero de ambos lados y gana con el spread y por estar posicionado contra el público cuando el público se equivoca. El volumen es el libro de apuestas del bookmaker, te dice dónde se amontona el dinero del público, que es justo el lado que el bookmaker está fadeando en silencio. Cuando lees un clímax de compra, ves al público cargar un lado mientras el bookmaker toma el otro.</p>

<p><b>Huellas en la nieve.</b> Un animal grande no puede cruzar un campo nevado sin dejar rastros, por más cuidadoso que sea. El operador es el animal grande; el volumen es la nieve. Puede disfrazar la dirección, fraccionar órdenes y trabajar callado, pero el tamaño de lo que debe transaccionar deja un rastro en el volumen que un ojo entrenado puede seguir. El precio dice que el animal pasó; el volumen dice cuán pesado era y hacia dónde iba de verdad.</p>

<p><b>La casa de subastas.</b> Un mercado es una subasta continua de doble vía. El precio es el bid-ask actual; el volumen es la cantidad de lotes que realmente cambian de manos en cada nivel. Un precio que sube con volumen fino es un subastador cantando números más altos a una sala vacía, sin compradores reales, solo ruido. Un precio que sube con volumen pesado es una sala llena de paletas compitiendo. El mismo número en el panel significa cosas opuestas según cuántos estén realmente pujando, y solo el volumen te dice cuál.</p>

<p>Ten estas tres en mente y las barras dejan de parecer formas aleatorias. Empiezas a ver la posición del bookmaker, el tamaño del animal y cuán llena está la sala, en cada barra.</p>`,
nosupply: `<div class="deep">
<h4>Qué es</h4>
<p>Una barra de no-supply es una barra bajista estrecha cuyo volumen es menor que el de las dos barras anteriores, el mercado sondeó más abajo y no halló vendedores. La barra de no-demand es su espejo en los techos.</p>
<h4>Cómo funciona</h4>
<p>El precio hace un nuevo mínimo (o máximo) marginal, pero el volumen que debería acompañar a una venta (o compra) genuina simplemente no está. La ausencia de participación es la señal, dice que el lado que conducía el movimiento abandonó la subasta en silencio.</p>
<h4>Por qué funciona</h4>
<p>Una tendencia necesita combustible continuo. Cuando el operador termina de acumular, deja de comprar y ejecuta un test: una pequeña sonda más abajo para confirmar que la venta minorista se agotó. Volumen bajo en esa sonda es la confirmación del propio operador, y la lees por encima de su hombro.</p>
<h4>Cómo aplicarlo</h4>
<p>Marca la fase primero (solo actúa con no-supply en acumulación o markup). Luego exige volumen por debajo de las dos barras previas, entra en el cierre de la barra y pon el stop unos ticks más allá de su extremo.</p>
<h4>El error común</h4>
<p>Actuar con un no-supply en la fase equivocada. En distribución, una barra bajista de bajo volumen no es señal de compra, es la calma antes del markdown. El contexto de fase lo es todo.</p>
<h4>El atajo</h4>
<p>Combínalo con un nivel de soporte conocido o el VWAP. Un test de no-supply que cae justo en un nodo de alto volumen previo tiene dos razones independientes para sostenerse, y el win rate sube con fuerza.</p>
<h4>El secreto</h4>
<p>Las barras de no-supply más potentes vienen <i>después</i> de un shakeout (un spring). El mercado atrapa vendedores bajo el soporte, y el test que revisita la zona en no-supply es la compra de mayor probabilidad que ofrece el método.</p>
<h4>El ejemplo real</h4>
<p>El mínimo del S&amp;P del 6 de marzo de 2009 (666) fue un nuevo mínimo marginal en volumen desplomándose, una confirmación clásica de no-supply del clímax de venta de octubre de 2008, semanas antes de que la tendencia revirtiera de verdad.</p>
<h4>El escenario ideal</h4>
<p>Una tendencia alcista confirmada (markup) retrocediendo a una media móvil o nivel de ruptura previo, imprimiendo una barra bajista estrecha con volumen que encoge visiblemente. Máxima claridad, mínimo riesgo.</p>
<h4>El escenario equivocado</h4>
<p>Un rango lateral sin dirección y sin fase establecida. Las barras de no-supply imprimen constantemente en el chop y no significan nada, no hay operador ejecutando un test, solo baja participación general.</p>
</div>`,
climax: `<div class="deep">
<h4>Qué es</h4>
<p>Un clímax es la única barra donde una emoción llega al pico: la barra más ancha del movimiento, en el mayor volumen en semanas, cerrando bien lejos de su extremo, ese cierre-lejos-del-extremo es la huella de la absorción.</p>
<h4>Cómo funciona</h4>
<p>La multitud llega al máximo de miedo (suelo) o codicia (techo) y transacciona en un frenesí. El operador compuesto toma todo el otro lado a escala. El volumen enorme es la emoción de la multitud; el cierre rechazado es la absorción del operador.</p>
<h4>Por qué funciona</h4>
<p>Los mercados giran en el punto de máxima participación en el lado equivocado, porque una vez que todos los que iban a entrar en pánico (o a perseguir) actuaron, no queda nadie para continuar el movimiento. El clímax es esa exhaustión hecha visible en el volumen.</p>
<h4>Cómo aplicarlo</h4>
<p>Nunca operes la barra de clímax en sí. Espera el test: una barra posterior que se sostiene más allá del extremo del clímax (un mínimo más alto tras un clímax de venta) en volumen muy por debajo del clímax. Entra en el test, stop más allá del extremo del clímax.</p>
<h4>El error común</h4>
<p>Atrapar el cuchillo cayendo, comprar la barra de clímax en tiempo real. Sin el test, no tienes confirmación de que la absorción se sostuvo, y una segunda pierna de clímax puede sacarte.</p>
<h4>El atajo</h4>
<p>Usa la regla del 50%: el test válido debe recuperar más de la mitad del rango de la barra de clímax. Si no puede, la absorción fue débil y un mínimo más bajo es probable.</p>
<h4>El secreto</h4>
<p>La barra de volumen más grande y aterradora es la de actuar, no la de evitar. El instinto del minorista de huir de la barra más aterradora es justo por qué el operador puede llenar ahí. Tu ventaja es hacer lo opuesto a tu instinto.</p>
<h4>El ejemplo real</h4>
<p>10 de octubre de 2008 (clímax de venta, volumen récord, cierre sobre el mínimo) y 10 de marzo de 2000 (clímax de compra en el Nasdaq, volumen récord, cierre rechazado) son los dos casos canónicos, direcciones opuestas, huella idéntica.</p>
<h4>El escenario ideal</h4>
<p>Una tendencia extendida y exhausta entrando en un nivel importante, luego una barra de volumen descomunal que cierra fuerte contra la tendencia. Máxima exhaustión, máxima señal.</p>
<h4>El escenario equivocado</h4>
<p>Una barra de alto volumen en medio de una tendencia sana que cierra <i>en la dirección</i> de la tendencia. Eso no es clímax, es fuerza. El clímax exige el cierre rechazado.</p>
</div>`,
psych: `<h2 id="psych">Por Qué la Multitud Siempre se Equivoca en los Extremos</h2>

<p>El VPA funciona por una verdad estructural sobre cómo se construyen los mercados, no por un truco. Entender el <i>porqué</i> a este nivel es lo que te permite sostener una posición que parece demente, comprar la barra más aterradora de un crash, con convicción en lugar de esperanza.</p>

<p>Empieza con un hecho contable simple: para que el mercado haga un suelo importante, el número máximo de personas ya debe estar posicionado corto o en efectivo. Si la mayoría siguiera alcista, habría más venta por venir y el suelo no se sostendría. Así que un suelo duradero <i>exige</i> pesimismo máximo, no es casualidad que los suelos se sientan horribles, es una necesidad estructural. La misma lógica se invierte en los techos: un techo exige que casi todos los que podían comprar ya lo hicieron, por eso los techos se sienten eufóricos y obvios. La emoción no es ruido alrededor del giro; la emoción <b>es</b> el giro.</p>

<p>Ahora suma al operador. Un participante que necesita comprar una posición muy grande tiene un problema: su propia compra empuja el precio en su contra, subiendo su coste medio. El único lugar donde llena tamaño barato es dentro de venta pesada, dentro del pánico exacto que produce el pesimismo máximo. Así que el operador está estructuralmente forzado a ser comprador cuando la multitud está más desesperada por vender, y vendedor cuando está más desesperada por comprar. No es más listo sobre la noticia; está posicionado opuesto a la emoción porque esa es la única forma de transaccionar tamaño. El volumen es el recibo de esa transacción.</p>

<p>Por eso la barra de clímax tiene su forma específica. El volumen enorme es la multitud capitulando; el cierre que rechaza el extremo es el operador absorbiéndola. No predices el futuro al leer un clímax de venta, lees, en tiempo real, el momento en que el comprador grande sobrepasó el pánico. La "predicción" es simplemente reconocer que, una vez que el número máximo de vendedores vendió, el camino de menor resistencia se invierte.</p>

<p>La consecuencia práctica es incómoda pero liberadora: <b>tu instinto se equivocará en cada giro importante, y eso es la señal.</b> Cuando una barra te da ganas de huir, ese miedo lo comparte toda la multitud, lo que significa que la venta está climaxando, lo que significa que el operador está llenando. La disciplina del VPA es, en gran parte, la disciplina de actuar contra tu propia lectura emocional del gráfico y confiar en el volumen. El trader que internaliza esto deja de necesitar coraje en los giros, simplemente lee el recibo y actúa.</p>`,
spring: `<div class="deep">
<h4>Qué es</h4>
<p>Un spring es una ruptura falsa bajo el soporte de un rango de acumulación que revierte de inmediato hacia dentro, atrapando a los vendedores que la rompieron. El evento operable es el <i>test</i> de bajo volumen del spring, no la barra del spring en sí.</p>
<h4>Cómo funciona</h4>
<p>El operador provoca (o simplemente explota) una caída bajo un soporte obvio. Los stops de quienes compraron el rango se disparan y los cortos de ruptura entran, ambos se vuelven compradores futuros forzados. El precio vuelve dentro del rango con volumen fuerte, y una sonda posterior de bajo volumen hacia el mínimo del spring confirma que no quedan vendedores.</p>
<h4>Por qué funciona</h4>
<p>Se construye sobre los stops de otros traders. Todo corto atrapado debe finalmente comprar para cubrirse, dando combustible incorporado al markup. El spring convierte las órdenes de protección de la multitud en la plataforma de lanzamiento del operador.</p>
<h4>Cómo aplicarlo</h4>
<p>Identifica un soporte horizontal claro con varios toques. En una ruptura por debajo que se sostiene solo una o dos barras y revierte, espera el test: un retorno hacia la zona del spring en volumen muy por debajo de la barra del spring, sin nuevo mínimo. Entra en el cierre del test, stop bajo el mínimo del spring.</p>
<h4>El error común</h4>
<p>Vender la ruptura inicial bajo el soporte, justo la trampa que el spring está diseñado para tender. Si el soporte rompe en volumen <i>bajo</i> y vuelve, eso es un spring, no un quiebre.</p>
<h4>El atajo</h4>
<p>Un spring genuino suele tener mayor volumen en la barra del shakeout que en el test. Si el volumen del test no es visiblemente menor que el del spring, desconfía.</p>
<h4>El secreto</h4>
<p>Los mejores springs ocurren tras un rango de acumulación largo y aburrido, cuanto más obvio y definido el soporte, más stops hay debajo, y más combustible libera la trampa.</p>
<h4>El ejemplo real</h4>
<p>Los springs son más visibles en sesiones individuales de futuros; en el diario, muchos mínimos importantes (incluidos nuevos mínimos marginales que revierten al instante en volumen encogiendo) son springs del rango previo.</p>
<h4>El escenario ideal</h4>
<p>Un rango de varias semanas con soporte nítido, un pinchazo brusco por debajo en un pico de noticia, una recuperación inmediata, luego un test tranquilo días después que se sostiene sobre el mínimo del spring.</p>
<h4>El escenario equivocado</h4>
<p>Una ruptura bajo el soporte en volumen creciente y sostenido que sigue cerrando más bajo. Eso es un quiebre real (markdown), no un spring, no le hagas fade.</p>
</div>`,
walkthrough: `<h2 id="walkthrough">Lectura de una Sesión Barra por Barra</h2>

<p>La teoría se vuelve instinto solo cuando la ves desplegarse en secuencia. Así lee un trader de VPA disciplinado una sesión representativa en el ES, no una sesión real fechada, sino un compuesto de los patrones que se repiten casi a diario. Sigue la lógica, no los números.</p>

<p><b>Pre-mercado.</b> Antes de la apertura, el trader marca la fase del timeframe mayor en el gráfico diario: el ES lleva tres semanas en markup estable, retrocediendo educadamente a su media ascendente cada vez. El sesgo del día es, por tanto, <i>compras en la debilidad</i>, nunca ventas, fase primero.</p>

<p><b>La apertura.</b> Los primeros quince minutos son violentos y de alto volumen, como siempre. El trader no hace nada. El volumen de apertura es mecánico, fondos ejecutando órdenes en la campana, y lleva poca información direccional. Leer esfuerzo-vs-resultado aquí es ruido; la subasta no se ha asentado.</p>

<p><b>Pullback de media mañana.</b> Hacia las 10:30 el índice deriva a la baja hacia su media móvil ascendente. El trader observa las barras bajistas: la primera es ancha en volumen decente (venta real), pero las dos siguientes se estrechan y su volumen encoge visiblemente bajo las barras previas. Esa es la secuencia de no-supply, vendedores agotándose en el soporte, dentro de un markup establecido. Es el setup que el día esperaba.</p>

<p><b>La entrada.</b> Una barra bajista estrecha imprime con volumen claramente bajo las dos barras previas y cierra a media altura, negándose a hacer un nuevo mínimo relevante. El trader entra en su cierre, stop unos ticks bajo el mínimo. El riesgo es pequeño porque la barra es pequeña, el regalo estructural del VPA.</p>

<p><b>El sostenimiento.</b> El precio sube. Las barras alcistas ahora muestran volumen expandiéndose y cierran cerca de sus máximos, demanda sana confirmando la lectura. El trader sostiene, realiza un tercio en el máximo del swing previo y mueve el stop a breakeven. El riesgo ahora es cero; el resto es dinero de la casa.</p>

<p><b>La advertencia.</b> Entrada la tarde, el precio se arrastra a un nuevo máximo marginal, pero la barra es estrecha y su volumen es el menor en una docena de barras. No-demand. Los compradores que llevaron el movimiento dejaron de aparecer. El trader no vende en pánico toda la posición, pero aprieta el stop móvil bajo el último mínimo más alto, porque el combustible se acabó.</p>

<p><b>La salida.</b> Dos barras después una barra bajista más ancha saca ese stop móvil. El trader está fuera, habiendo capturado lo grueso de la pierna de markup y salido en el momento en que el volumen dijo que la demanda se había ido. Sin predicción, sin opinión, sin noticia, solo una secuencia de lecturas de volumen, cada una una decisión pequeña y repetible. Así es como luce una sesión de VPA: mayormente esperar, unas pocas lecturas precisas, y salidas guiadas por la desaparición del lado que te pagaba.</p>`,
cases: `<h2 id="cases">Tres Casos Reales, La Misma Huella, Tres Décadas Aparte</h2>

<p>Los patrones que solo ves en libros parecen abstractos. Los patrones que ves repetirse en los mayores eventos de mercado de los últimos veinticinco años parecen inevitables. Aquí tres puntos de giro que cada principio de VPA de esta guía predijo en tiempo real, no con retrospectiva, sino con la firma de volumen exacta que describimos. Las fechas y cifras son de registro público; ábrelas en cualquier gráfico y lee el volumen tú mismo.</p>

<div class="story">
<h4>Caso 1, El Clímax de Venta de Octubre de 2008 (S&amp;P 500)</h4>
<p>El colapso de Lehman Brothers el 15 de septiembre de 2008 inició una cascada. En las semanas siguientes el S&amp;P 500 cayó sin tregua, y el <b>10 de octubre de 2008</b> imprimió un clímax de venta de proporciones históricas: un rango intradía de unos 100 puntos, el mayor volumen semanal que el índice había registrado hasta entonces, y un cierre que se elevó dramáticamente sobre el mínimo de la sesión. Ese cierre-sobre-el-mínimo es la huella de la absorción, alguien enorme compraba cada acción que el pánico arrojaba. El VIX, el medidor de miedo, se disparó hacia 70 y alcanzaría un intradía de 89,53 el 24 de octubre. Un lector de VPA no necesitaba cantar el suelo exacto; necesitaba reconocer que un esfuerzo máximo (volumen récord) había producido un resultado fallido (un cierre muy sobre el mínimo), y que esa es la firma clásica de capitulación. El mercado se agitó violentamente durante meses, pero el clímax marcó el momento en que la oferta se agotó. El suelo verdadero llegó el 6 de marzo de 2009 en S&amp;P 666, en un test tranquilo y de bajo volumen que hizo un nuevo mínimo marginal mientras el volumen se secaba, la confirmación clásica de no-supply. Esfuerzo, resultado, absorción, test: el vocabulario entero, escrito a lo largo del peor crash en ochenta años.</p>
</div>

<div class="story">
<h4>Caso 2, La Capitulación del COVID en Marzo de 2020 (S&amp;P 500)</h4>
<p>El bear market más rápido de la historia: el S&amp;P 500 cayó cerca de 34% en apenas 23 sesiones, del máximo del 19 de febrero de 2020 al mínimo del 23 de marzo de 2020 en 2.191. La semana del 16–20 de marzo produjo volumen colosal y un VIX que cerró en 82,69 el 16 de marzo, lecturas que rivalizan o superan 2008. La barra de capitulación del 23 de marzo tenía la forma ya familiar: volumen enorme, rango ancho, y un cierre que se negó a quedarse en el mínimo. El operador compuesto acumulaba dentro de los titulares más aterradores de una generación. Lo que hace este caso instructivo es la velocidad: toda la fase de acumulación que tomó meses en 2008–09 se comprimió en días en 2020, porque la causa (el shock del COVID) fue súbita en vez de estructural. Misma huella, reloj distinto. Un trader leyendo volumen en vez de titulares vio esfuerzo-sin-resultado-bajista en el momento exacto en que la multitud estaba más segura de que el mundo se acababa.</p>
</div>

<div class="story">
<h4>Caso 3, El Clímax de Compra de Marzo de 2000 (Nasdaq Composite)</h4>
<p>Los clímax funcionan en ambas direcciones, y el techo de las puntocom es el clímax de compra más limpio de la era moderna. El Nasdaq Composite alcanzó el pico intradía de 5.048,62 el <b>10 de marzo de 2000</b> tras un ascenso casi vertical, en el volumen más pesado que el índice había visto, el blow-off. La euforia minorista era total; todos "sabían" que la nueva economía había derogado las viejas reglas. Ese volumen récord con un cierre estancado y rechazado era la huella de la distribución: el operador compuesto descargando inventario en la última ola de demanda frenética. El índice no volvería a ese nivel en quince años. La lección es idéntica a la del clímax de venta, invertida: la barra que se sintió más emocionante, la que gritaba "por fin rompe de verdad", fue el momento preciso en que el smart money entregó su posición a la multitud. Codicia máxima, volumen máximo, continuación fallida.</p>
</div>

<p>Tres eventos, tres décadas, dos direcciones, una huella. Los instrumentos cambiaron, los titulares cambiaron, la velocidad cambió. La firma en el volumen no. Esa repetibilidad es por qué un marco centenario aún funciona: no es emparejar patrones en formas de precio, que mutan, sino en comportamiento humano en los extremos, que no muta.</p>`,
instruments: `<p>Un poco más de profundidad en cada uno, porque la misma señal de VPA se comporta distinto según la microestructura del instrumento:</p>

<p><b>ES (futuros del S&amp;P 500)</b> es el instrumento de VPA del connoisseur. Su profundidad hace que los clímax y los test de no-supply impriman con claridad inusual, y las señales falsas son más raras porque mover el ES requiere tamaño genuino. La contrapartida es que la sesión del mediodía puede comprimirse en un rango estrecho de bajo volumen donde cada barra parece un no-supply y ninguna lo es, la trampa de la sesión muerta en su forma más pura. Opera la apertura y la tarde; respeta la calma del almuerzo.</p>

<p><b>NQ (futuros del Nasdaq 100)</b> se mueve más rápido y más amplio que el ES ante la misma noticia, lo que hace sus clímax más dramáticos pero sus stops deben ser más amplios. La firma de volumen es igual de legible, pero la velocidad castiga la duda, un test de no-supply en NQ se resuelve en menos barras, así que tu entrada debe ser mecánica. Los principiantes a menudo van mejor aprendiendo los patrones en ES primero, y graduándose a NQ cuando las lecturas son automáticas.</p>

<p><b>CL (futuros del petróleo)</b> da los picos de clímax más violentos de los cuatro, lo que hace sus reversiones dramáticas y rentables, pero da latigazos fuertes alrededor del informe semanal de inventarios de la EIA (miércoles, 10:30 ET) y los titulares mensuales de la OPEP. La disciplina aquí es conciencia de calendario: quédate fuera durante el informe, luego lee el volumen cuando la subasta se normalice. CL premia la paciencia y castiga a quien opera volumen durante un shock programado.</p>

<p><b>GC (futuros del oro)</b> muestra rangos de acumulación bellamente limpios porque el oro pasa largos periodos en equilibrio, construyendo causa antes de una liberación. Su debilidad es la sesión asiática fina, donde un puñado de contratos mueve el precio y la señal de volumen se vuelve poco fiable. Lee GC durante Londres y EE.UU.; trata las barras asiáticas de madrugada como de baja confianza.</p>`,
myths: `<h2 id="myths">Cinco Mitos Sobre el Volumen, Derribados</h2>

<p>El mal folclore del volumen está en todas partes, y la mayoría perjudica activamente a los traders. Aclarar estos cinco equívocos vale tanto como aprender los setups.</p>

<p><b>Mito 1, "El volumen confirma la tendencia."</b> Media verdad y peligrosamente incompleto. El volumen confirma un movimiento solo cuando esfuerzo y resultado concuerdan. Precio subiendo en volumen creciente con cierres cerca de los máximos confirma; precio subiendo en volumen creciente con cierres a media altura (absorción) advierte reversión. "El volumen confirma la dirección" sin leer el cierre es como los traders compran el techo exacto.</p>

<p><b>Mito 2, "El volumen alto es alcista."</b> El volumen no tiene dirección inherente. La misma barra de volumen enorme es un clímax de compra (bajista) en un techo y un clímax de venta (alcista) en un suelo. El volumen mide la intensidad de la participación, no su dirección, el cierre y la fase te dicen la dirección.</p>

<p><b>Mito 3, "Necesitas Level 2 / el libro de órdenes para leer volumen."</b> El libro muestra órdenes en reposo (intenciones), que pueden spoofearse y retirarse. El volumen negociado muestra lo que realmente se ejecutó (compromiso), que no puede falsificarse. El VPA en un gráfico simple de precio + volumen lee compromiso, el más honesto de los dos. Level 2 es un complemento útil, no un prerrequisito.</p>

<p><b>Mito 4, "Los indicadores de volumen (OBV, etc.) reemplazan leer las barras."</b> Los indicadores de volumen acumulado suavizan justo la información más importante: la relación entre el spread, el cierre y el volumen de esta barra. Son resúmenes, y los resúmenes ocultan el clímax y el test de no-supply, justo las barras que operas. Úsalos para contexto de divergencia, nunca como sustituto de leer la barra.</p>

<p><b>Mito 5, "El volumen no importa en mercados 24h o dominados por algos."</b> Los algoritmos son los mayores participantes de todos, y ellos tampoco pueden transaccionar tamaño sin dejar volumen. Si acaso, la ejecución algorítmica deja las huellas más limpias, porque la acumulación y distribución programáticas son más sistemáticas que las humanas. El medio cambió; la ley de que el tamaño deja rastro no.</p>`,
confluence: `<p>Una advertencia sobre la confluencia: más herramientas no es más ventaja. La tentación, una vez que tienes VWAP, profile y RVOL en pantalla, es esperar a que todos concuerden, y el mercado rara vez te da una alineación perfecta de cinco factores antes de moverse. El profesional usa una o dos confirmaciones para graduar una señal de VPA, no cinco para paralizarla. La lectura de volumen es el motor; las herramientas extra son el tablero, útiles para contexto pero nunca razón para anular un test de no-supply limpio que el motor ya dio. Si te encuentras añadiendo un sexto indicador para sentirte seguro, el problema no es el gráfico, es que aún no has confiado en el volumen.</p>`,
manage: `<h2 id="manage">Gestionar el Trade Tras la Entrada, y el Diario que Construye la Ventaja</h2>

<p>La mayoría del material de VPA se detiene en la entrada. Pero la entrada es quizá un tercio del resultado; lo que haces tras quedar lleno, y lo que registras después, es de donde viene la consistencia.</p>

<h3>Gestionar la posición</h3>

<p>Una vez dentro de un trade de VPA, la misma lógica de volumen que te metió gobierna cómo te quedas. Tras una entrada de pullback no-supply en markup, sostienes mientras las barras alcistas muestren volumen expandiéndose y los pullbacks muestren volumen encogiéndose, el ritmo sano del markup. En el momento en que ves lo contrario (barras alcistas en volumen encogiéndose, una barra de no-demand haciendo un nuevo máximo), la demanda que te llevó se fue y toca apretar o salir. No gestionas solo por un objetivo fijo; lees si el operador sigue de tu lado.</p>

<p>Realiza por partes en la estructura. Toma beneficio parcial en el primer máximo de swing previo (o el máximo del auto-rally tras una reversión de clímax), mueve el stop a breakeven, y deja que el resto corra contra la estructura móvil. El primer objetivo paga el trade y elimina riesgo; el runner es donde aparece la asimetría recompensa-riesgo del VPA. El error de gestión más común es el inverso, dejar toda la posición correr por un home run y devolver el primer objetivo fácil cuando aparece la primera barra de no-demand.</p>

<p>Respeta la invalidación de forma absoluta. Toda la ventaja de los stops ajustados del VPA se evapora si los amplías en el momento. Si el precio quita el mínimo del spring, el mínimo del clímax o el mínimo de la barra de no-supply, la lectura estaba mal, no "temprano", mal. Sal y relee. El mercado ofrecerá otra barra; una cuenta reventada no.</p>

<h3>El diario que compone</h3>

<p>El VPA es reconocimiento de patrones, y el reconocimiento de patrones se construye con repetición deliberada y revisada. Un diario basado en capturas es el acelerador más rápido que existe. Para cada trade, captura el gráfico en la entrada y anota cuatro cosas: la fase que creías estar, la señal específica (no-supply / test de clímax / spring), la lectura de volumen que lo confirmó y dónde estaba la invalidación. Luego, al cerrar el trade, añade una quinta nota: qué pasó realmente y si tu lectura de fase fue correcta.</p>

<p>Revisa semanalmente, ordenando por resultado. Cazas dos cosas. Primero, los setups donde tu win rate es genuinamente alto, concentra ahí y corta el resto. Segundo, la razón recurrente por la que fallan tus perdedores; en casi todo diario de trader la respuesta es la misma, tomaron la señal correcta en la fase equivocada, o en una sesión estructuralmente muerta. Nombrar la fuga es lo que la cierra. Un trader con cien capturas anotadas lee volumen de un modo que ninguna cantidad de teoría produce, porque construyó el reconocimiento empíricamente, no intelectualmente.</p>`,
hacks: `<h2 id="hacks">Siete Hacks Avanzados de VPA que los Cursos Cobran por Enseñar</h2>

<p>Una vez que los fundamentos son automáticos, estos refinamientos separan a un lector competente de uno afilado. Cada uno es una regla concreta y comprobable, no un principio vago, el tipo de ventaja que compone a lo largo de cientos de trades.</p>

<ol>
  <li><b>La regla de las dos barras de volumen.</b> Una barra de no-demand o no-supply solo cuenta si su volumen es menor que el de <i>ambas</i> barras previas, no solo una. Este único filtro elimina la mayoría de las señales falsas, porque confirma una caída genuina y sostenida de participación en vez de un lapsus de una barra.</li>
  <li><b>La exhaustión de demanda necesita un ancla en el VWAP.</b> Un test de no-supply que se sostiene <i>sobre</i> el VWAP de la sesión es dramáticamente más fuerte que uno por debajo. Las instituciones que usan el VWAP como benchmark de ejecución son, por definición, compradoras dispuestas por encima, así que un test de bajo volumen ahí tiene al dinero grande de tu lado. Bajo el VWAP, peleas con ellas.</li>
  <li><b>La regla del 50% del clímax.</b> Tras un clímax genuino, mide el rango de la barra de clímax. El primer test válido debe sostenerse más allá de la marca del 50% (sobre el punto medio para un clímax de venta, bajo él para uno de compra). Un test que no recupera la mitad del rango del clímax es débil y a menudo precede una segunda pierna.</li>
  <li><b>El volumen relativo gana al volumen bruto.</b> "Alto" y "bajo" no significan nada sin contexto. Usa una lectura de volumen relativo (RVOL) contra la media del mismo horario del día: una barra de no-supply con RVOL bajo 0,5 (menos de la mitad de la participación usual de ese horario) es mucho más fiable que juzgar el histograma a ojo, distorsionado por la sonrisa natural de volumen de la sesión.</li>
  <li><b>La posición del cierre es el mensaje entero.</b> En cualquier barra climática o ancha, ignora el máximo y el mínimo un instante y pregunta solo: ¿dónde, en el rango de la barra, cerró? Tercio superior, ganó la demanda. Tercio inferior, ganó la oferta. Medio, la batalla está sin resolver y esperas. El cierre es el pixel más denso de información del gráfico.</li>
  <li><b>Cuidado con la trampa de la sesión muerta.</b> El bajo volumen en periodos estructuralmente muertos, la calma del almuerzo, los últimos viernes de verano, las horas alrededor de un feriado, es <i>ruido</i>, no señal de no-supply. La misma barra estrecha de bajo volumen significa "el smart money está testeando" en horas activas y "no hay nadie" a las 12:30 de un viernes de agosto. Pondera siempre la señal por si la sesión debería estar activa.</li>
  <li><b>Apila los timeframes, nunca los mezcles.</b> Lee la fase en el diario o 4 horas y toma la señal en el 15 o 5 minutos. El timeframe mayor es tu filtro (solo largos en markup del TF mayor, solo cortos en markdown); el menor es tu disparador. Los traders que intentan hacer ambos trabajos en un gráfico son zarandeados por señales que contradicen la fase mayor.</li>
</ol>

<p>Ninguno de estos es secreto en el sentido de estar oculto, son secretos en el sentido de que casi nadie los aplica con disciplina. La ventaja no es saber la regla; es seguirla en el trade número cuatrocientos, cuando estás cansado, el setup es tentador y falta una de las siete condiciones.</p>`,
faq4: `<p class="faq-q">¿Cuál es la diferencia entre VPA y VSA (Volume Spread Analysis)?</p>
<p class="faq-a">Son esencialmente el mismo cuerpo de conocimiento con etiquetas de linaje distintas. VSA es el sistema con marca de Tom Williams centrado en la relación spread-cierre-volumen; VPA es el encuadre más amplio y accesible popularizado por Anna Coulling que mantiene precio y volumen explícitamente juntos. El vocabulario (no-demand, no-supply, test, clímax) es compartido. Si aprendes uno, has aprendido el otro.</p>

<p class="faq-q">¿VPA funciona en cripto?</p>
<p class="faq-a">Parcialmente, y con cautela. En una venue dominante única (p. ej. futuros de BTC en CME, o un par top en un exchange grande) el volumen es bastante honesto para leer clímax y tests. Pero el volumen total de cripto está fragmentado entre decenas de exchanges, mucho con wash trading en venues menores, así que el "volumen" agregado puede no ser fiable. Quédate en el instrumento más líquido en la venue más reputada y trata las lecturas como algo más ruidosas que en futuros regulados.</p>

<p class="faq-q">¿VPA puede automatizarse o codificarse en un indicador?</p>
<p class="faq-a">Las partes mecánicas sí, volumen relativo, medición de spread, posición del cierre y flags simples de no-demand/no-supply son codificables, y muchas plataformas traen indicadores estilo VSA. Pero el juicio de mayor valor (en qué fase está el mercado, si la sesión está estructuralmente activa, si un nivel importa) aún se beneficia de una lectura humana. Usa código para marcar candidatos; usa los ojos para confirmar fase y contexto antes de actuar.</p>

<p class="faq-q">¿Cuál es la razón más común por la que los traders de VPA pierden dinero?</p>
<p class="faq-a">Operar la señal correcta en la fase equivocada. Una barra de no-supply es una compra perfecta en markup y una trampa en distribución; la barra parece idéntica, solo la fase difiere. Los traders que fallan casi siempre se saltaron la disciplina de identificar la fase del timeframe mayor antes de actuar en una señal del menor. Fase primero, señal después, siempre.</p>`,
conclusion: `<p>Fíjate en lo poco que esta guía trató de predicción. El VPA no pronostica; lee. Te dice, en presente, quién gana cada barra, si el esfuerzo produce resultado y en qué fase está el mercado. La "ventaja" no es una bola de cristal, es la negativa a ser engañado por movimientos de precio sin participación detrás, y la disposición a actuar contra tu propia emoción justo cuando la multitud está más segura. Es una afirmación más pequeña y humilde que la de la mayoría de los sistemas, y por eso precisamente sobrevive donde ellos no.</p>

<p>Si te llevas una cosa de esta guía, llévate la pregunta que sostiene el método entero: <i>¿hay esfuerzo real detrás de este movimiento, y está produciendo un resultado real?</i> Házsela a cada barra significativa, en cada gráfico, en cada mercado. Cuando la respuesta es sí, confía en el movimiento. Cuando esfuerzo y resultado discrepan, alguien grande se esconde, y ahora sabes cómo verlo.</p>

<div class="deep">
<h4>Tu primera semana con VPA</h4>
<p><b>Días 1–2:</b> Añade un histograma de volumen al gráfico y quita todos los demás indicadores. Pasa dos sesiones haciendo nada más que nombrar barras en voz alta, rango amplio alcista, no-demand, no-supply, clímax, sin operar.</p>
<p><b>Días 3–4:</b> En el gráfico diario de ES o NQ, marca la fase actual (acumulación, markup, distribución, markdown). Escribe en qué dirección tienes permitido operar en esa fase, y no operes en otra.</p>
<p><b>Días 5–7:</b> Solo en simulación, toma el setup de pullback no-supply, y solo ese, en un gráfico de 5 minutos, pero solo en la dirección que la fase del diario permite. Registra una captura de cada entrada. No arriesgues un céntimo de capital real hasta tener cincuenta trades simulados registrados y un win rate documentado.</p>
</div>`,
};
