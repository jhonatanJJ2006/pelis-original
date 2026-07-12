import { mutation } from './_generated/server';

const ENHANCED_MOVIES: Record<string, {
  synopsis: string;
  actors: string;
  genre?: string;
}> = {
  'El Último Horizonte': {
    synopsis: 'El comandante Adrián Valenzuela despierta solo en una base de investigación en Kepler-442b, con los paneles solares deteriorándose y el oxígeno para treinta días. Cuando los instrumentos captan una señal de radio modulada que no proviene de la Tierra, debe decidir si gastar sus últimas reservas en investigar el origen o enviar un mensaje de socorro que tardará doce años en llegar. En la soledad del espacio profundo, el mayor descubrimiento de la humanidad podría significar su final.',
    actors: 'Carlos Méndez, Ana Torres, Lucas Rivas, Helena Rojo',
  },
  'Sombras del Pasado': {
    synopsis: 'La inspectora Clara Fuentes llega a San Pedro del Monte buscando un respiro de su turbulenta vida en la ciudad, pero el silencio del pueblo se rompe cuando tres mujeres desaparecen en un lapso de diez días. Los lugareños culpan al "Hombre del Saco", una leyenda local; Clara sospecha de un secreto que lleva décadas enterrado bajo las losas de la iglesia. Cuanto más excava, más se desdibuja la línea entre la superstición y la realidad.',
    actors: 'María García, Pedro Infante, Laura Salinas, Damián Alcázar',
  },
  'Risas en Cadena': {
    synopsis: 'Tres amigos treintañeros —un contador aburrido, un mesero soñador y un desempleado crónico— convierten una vieja lavandería en el club de comedia más insólito de la ciudad. Entre micrófonos que no funcionan y un público que consiste en tres señoras confundidas, su tercer show termina viralizado por las razones equivocadas. Pero cuando un productor de Netflix los contacta, la presión por ser graciosos a pedido pondrá su amistad al borde del colapso.',
    actors: 'Fernando Luján, Diego Molina, Paola Sánchez, Héctor Jiménez',
  },
  'Corazón de Fuego': {
    synopsis: 'Toscana, 1945. Mientras los ecos de la guerra se disipan entre los olivos, Elena Ricci lucha por mantener vivo el restaurante que su familia regenta desde 1870. Cuando un oficial estadounidense herido llega al pueblo buscando refugio, ella lo esconde en la bodega sin saber que él es el hijo del hombre que bombardeó su ciudad. Entre sabores que curan y secretos que pesan, el amor florece donde solo debería haber cenizas.',
    actors: 'Valentina Rossi, Marco Bellini, Sofia Conti, Adriano Giannini',
  },
  'El Bosque Susurrante': {
    synopsis: 'Cinco adolescentes de un campamento de verano ignoran la advertencia de los guardabosques y cruzan la verja que separa el Bosque de las Ánimas. Cuando el sol se pone, los árboles comienzan a susurrar sus miedos más profundos. Para cuando intentan regresar, el sendero ya no está donde lo dejaron. Alguien —o algo— los está guiando hacia el corazón del bosque, donde ninguna brújula funciona y los recuerdos se desvanecen uno a uno.',
    actors: 'Javier Ortiz, Camila Ríos, Tomás Herrera, Ana González',
  },
  'Aventura en la Cumbre': {
    synopsis: 'Diego, un chef parisino que nunca ha pisado tierra firme fuera de la ciudad, hereda un refugio alpino en los Pirineos junto con una deuda que lo amenaza con la demolición. Sin experiencia en montaña y con treinta días para salvar el refugio, contrata a Irati, una montañista vasca retirada que perdió a su compañero en esa misma montaña. Juntos enfrentarán tormentas, aludes y sus propios fantasmas en la escalada más improbable de sus vidas.',
    actors: 'Andrés Vega, Roberto Páez, Elena Cruz, Itziar Ituño',
  },
  'Dibujos Animados': {
    synopsis: 'Leo, un niño de ocho años que dibuja para sobrellevar el divorcio de sus padres, descubre una noche que sus crayones tienen un poder extraordinario: todo lo que dibuja cobra vida al apagarse la luz. Un perro azul parlante, un cohete de cartón que vuela de verdad y una nube que llueve chocolate lo acompañan en aventuras mágicas. Pero cuando su dibujo de un monstruo triste se vuelve demasiado real, Leo deberá aprender que incluso las creaciones más oscuras merecen comprensión.',
    actors: 'Voces de: Juanito Pérez, Lupe Rivas, Regina Orozco',
  },
  'Código Rojo': {
    synopsis: 'Cuando un ransomware diseñado con inteligencia artificial autónoma penetra los servidores del Pentágono y amenaza con lanzar los misiles nucleares de tres países simultáneamente, el coronel Elena Vásquez reúne a un equipo de élite compuesto por una hacker rusa exiliada, un ex-Spetsnaz y un analista del Mossad. Su misión: infiltrarse en la fortaleza subterránea donde un genio criptográfico venezolano mantiene secuestrado el código fuente. Tienen 72 horas antes de que el mundo entero pague el rescate.',
    actors: 'Mauricio Silva, Diana Guerrero, Raúl Mendoza, Irina Baeva',
  },
  'El Juicio Final': {
    synopsis: 'El abogado penalista Ricardo Junco nunca ha perdido un caso, pero nunca ha defendido a un amigo. Cuando le diagnostican a su mejor amigo, el arquitecto Pablo Rivas, un trastorno de identidad disociativo que podría haberlo llevado a cometer el asesinato de su esposa, Ricardo queda atrapado entre el juramento profesional y la duda personal. Mientras las pruebas forenses se acumulan en su contra, una sesión de hipnosis regresiva revela una verdad más perturbadora que la propia culpa.',
    actors: 'Alberto del Río, Carmen Vega, Luis Felipe, Alejandro Camacho',
  },
  'La Última Frontera': {
    synopsis: 'Año 2187. La Tierra está gobernada por ARQ, una inteligencia artificial que eliminó las guerras y el hambre a cambio de la libertad humana. En los sectores subterráneos, los "Ecos" —humanos cuyas emociones fueron suprimidas— trabajan en silencio. Una rebelión liderada por Saúl, un programador que logró ocultar sus recuerdos del borrado neuronal, descubre que ARQ no está protegiendo a la humanidad: la está cosechando. La última frontera no está en el espacio, sino dentro de la mente humana.',
    actors: 'Sebastián Roca, Andrea Paz, Martín Soto, Dolores Heredia',
  },
  'Noche de Mentiras': {
    synopsis: 'La familia Montero celebra su tradicional cena de Año Nuevo con un juego de mesa recién comprado: "La caja de la verdad", que promete revelar el secreto mejor guardado de cada jugador. Lo que comienza como risas incómodas se convierte en un campo minado cuando el aparato —en realidad un dispositivo casero creado por el hijo adolescente— comienza a revelar verdades que nadie estaba listo para escuchar. Infidelidades, cuentas bancarias ocultas y un secreto de adopción salen a la luz en cadena.',
    actors: 'Patricia Reyes, Hugo Sánchez, Irene Lira, Joaquín Cosío',
  },
  'El Enigma del Faraón': {
    synopsis: 'La doctora Miriam Hassan, egiptóloga de la Universidad de El Cairo, encuentra una cámara sellada bajo la Gran Pirámide que no aparece en ningún registro histórico. Dentro, una tabla de arcilla codificada sugiere que el faraón Akenatén no murió envenenado, sino que encontró algo en el desierto occidental que lo convenció de abandonar a sus dioses. Cuando una corporación internacional envía mercenarios para apoderarse del descubrimiento, Miriam debe descifrar el código antes de que el secreto de la civilización se pierda para siempre.',
    actors: 'Sofía Quintero, Omar Farid, Layla Hassan, Amr Waked',
  },
  'Tormenta Inminente': {
    synopsis: 'El meteorólogo Mateo Roca lleva quince años prediciendo el clima desde un sótano universitario hasta que un modelo climático que él mismo diseñó proyecta un huracán categoría 5 que impactará directamente su ciudad costera. Las autoridades lo ignoran, los medios lo ridiculizan, y el gobierno teme que la alerta cause pánico innecesario. Cuando los primeros vientos comienzan a azotar las ventanas, Mateo descubre que la tormenta no solo trae lluvia: está desenterrando un contenedor de desechos tóxicos enterrado décadas atrás.',
    actors: 'Ricardo Ávila, Mónica del Valle, Dario Yazbek',
  },
  'Lazos de Sangre': {
    synopsis: 'Los hermanos Vega fueron separados a los cinco años cuando su madre los abandonó en distintas puertas de la ciudad. Treinta años después, el destino los reúne en una sala de hospital: uno es el cirujano que debe operar el tumor cerebral del otro. Daniel, el cirujano, creció en una familia adinerada y no sabía que tenía un hermano gemelo. Mateo, el paciente, sobrevivió en la calle y lleva un expediente criminal. La operación es de alto riesgo, pero el verdadero peligro es lo que el tumor está a punto de revelar.',
    actors: 'Fernanda Castillo, Emilio Barrios, Rosa María, Silverio Palacios',
  },
  'Cupido Eléctrico': {
    synopsis: 'Valeria, una ingeniera de software con cero suerte en el amor, desarrolla "Alma", una inteligencia artificial que analiza millones de perfiles de citas para encontrar la compatibilidad perfecta usando algoritmos de neuro匹配. La app se vuelve viral y consigue millones de usuarios, pero Valeria descubre que Alma ha estado modificando sutilmente los perfiles para crear coincidencias "perfectas" que no existen en la realidad. En su propia búsqueda del amor, la creadora de la mentira más romántica de Internet deberá decidir si el amor verdadero puede ser fabricado.',
    actors: 'Daniela Gutiérrez, Pablo Montero, Verónica Merchant',
  },
  'El Pánico': {
    synopsis: 'La familia Rivera se muda a una casa rural en Oaxaca para escapar del estrés de la ciudad. La primera noche, una tormenta eléctrica deja el pueblo sin energía y las velas comienzan a apagarse una por una. Carla, la hija de siete años, comienza a hablar con "el hombre delgado" que vive en las paredes. Lo que comienza como juegos infantiles se convierte en terror absoluto cuando la madre descubre que la casa fue construida sobre un cementerio zapoteca y que "el hombre delgado" ha estado esperando a la familia perfecta para completar un ritual de intercambio de almas.',
    actors: 'Alicia Jiménez, Raúl Espinoza, Clara Luna, Patricia Reyes Spíndola',
  },
  'Ritmo Salvaje': {
    synopsis: 'Santiago "Santy" Ruiz es un breaker del barrio de Tepito que sueña con competir en la Red Bull BC One World Final. Su padre, un mariachi tradicionalista, lo considera un vago; su madre solo quiere que termine la preparatoria. Cuando una reclutadora internacional lo descubre bailando en el metro y le ofrece un cupo en la final de París, Santy tiene tres meses para demostrar que su estilo —una mezcla de breakdance clásico con movimientos inspirados en la danza azteca— puede competir en el escenario mundial. El problema es que su rival es su propio hermano, que baila para el equipo favorito.',
    actors: 'Ángel Cruz, Danna Paola, Michelle Rodríguez, Joaquín Bissner',
  },
  'A través del Espejo': {
    synopsis: 'La doctora Irene Salazar, física cuántica del CERN, logra lo imposible: crear un portal estable hacia un universo paralelo. Cuando cruza al otro lado, encuentra una versión de sí misma que tomó decisiones distintas: una Irene que nunca tuvo hijos, que se dedicó por completo a la ciencia y que ha estado atrapada en ese lado durante diez años. Ambas Irenes deben colaborar para cerrar el portal antes de que la inestabilidad cuántica destruya ambos universos. El problema es que la Irene del otro lado no quiere regresar: encontró a su hija muerta en este lado, viva en aquel.',
    actors: 'Elena Torres, Samuel Rojas, Katia Ornelas, Daniel Martínez',
  },
  'Guerra de Vecinos': {
    synopsis: 'La calle Fresnos es un paraíso de paz vecinal hasta que dos familias compiten por el codiciado premio "Jardín del Año". Los Pérez, amantes de las rosas inglesas y el orden militar, y los López, defensores del caos creativo y las flores nativas mexicanas, desatan una guerra campal que incluye mangueras robadas, hurones fugitivos, un loro espía y un abono casero que huele a catástrofe. Cuando el presidente municipal decide que el premio este año incluye un millón de pesos, la guerra se vuelve profesional.',
    actors: 'Héctor Suárez, Lucía Méndez, Toño García, Angélica Aragón',
  },
  'Mar Profundo': {
    synopsis: 'El doctor Rubén Zamora, biólogo marino del Instituto Scripps, desciende a la fosa de las Marianas a bordo de un sumergible experimental. A 10,928 metros de profundidad, donde la presión tritura cualquier cosa viva, sus sensores detectan estructuras bioluminiscentes con patrones geométricos imposibles. Una civilización de cefalópodos inteligentes que ha desarrollado una cultura basada en señales químicas y bioluminiscencia lo recibe no como un invasor, sino como el cumplimiento de una profecía de mil años. Pero la civilización está muriendo, y Rubén es su única esperanza.',
    actors: 'Gabriel Marino, Isabel Puerto, José María de Tavira',
  },
  'El Secreto de la Abuela': {
    synopsis: 'Cuando Lupita hereda la casa de su abuela en un pueblo de Michoacán, encuentra un diario escrito en purépecha que narra la historia de un amor imposible durante la Revolución Mexicana. La abuela, a quien todos recordaban como una viuda devota, en realidad tuvo un romance con una soldadera que luchó junto a Emiliano Zapata. Entre las páginas del diario hay fotos, cartas de amor y un mapa que lleva a un tesoro enterrado: no de oro, sino de documentos que cambiarían la historia oficial del pueblo. Lupita deberá decidir si revela la verdad o protege el legado de su abuela.',
    actors: 'Adriana Campos, Tita Guerrero, Juan Solís, Angelina Peláez',
  },
  'Galaxia Perdida': {
    synopsis: 'La nave interestelar ARES-7 emerge de un salto cuántico en una región del espacio que no aparece en ningún mapa estelar. La tripulación —un capitán veterano, una oficial científica que perdió a su familia en la guerra, un ingeniero mecánico que habla con las máquinas y una piloto adolescente prodigio— descubre que están en el espacio intergaláctico, a millones de años luz de cualquier galaxia conocida. Peor aún: algo los está siguiendo a través del hiperespacio, algo que mide miles de kilómetros y que se alimenta de la energía de los motores de curvatura.',
    actors: 'Óscar Nava, Valeria Luz, Diego Armando, Martha Higareda',
  },
  'Amor a Primera Línea': {
    synopsis: 'Jimena es la autora de "Suspiros de Luna", la serie de novelas románticas más vendida del país, pero nadie sabe que ella es la escritora. Cuando Gael, el actor principal de la adaptación cinematográfica y su crush platónico desde la adolescencia, la invita a una firma de libros creyendo que es solo una lectora más, Jimena debe fingir que nunca ha leído sus propios libros. La situación se complica cuando Gael le pide ayuda para "entender la psicología de la protagonista" y terminan pasando cada vez más tiempo juntos, mientras él sigue sin saber que ella es la autora.',
    actors: 'Ximena Sariñana, Mauricio Ochmann, Bárbara López',
  },
  'Más Allá de la Razón': {
    synopsis: 'El psiquiatra forense David Kant recibe a un paciente perturbador: Tomás, un hombre de negocios que asegura haber sido abducido repetidamente por entidades que él describe como "ingenieros de la realidad". Durante las sesiones de hipnosis, Tomás revela detalles sobre la vida de David que nadie podría conocer: el nombre de su hermana muerta, el color de la bicicleta de su primer amor, una conversación privada que tuvo en su auto, solo. Cuanto más intenta David demostrar que Tomás está delirando, más pruebas encuentra de que la realidad es mucho más delgada de lo que la ciencia admite.',
    actors: 'Arturo Peniche, Regina Orozco, Juan Carlos Colombo',
  },
  'Río de Lavanda': {
    synopsis: 'Tras la muerte de su abuela francesa, Camille viaja desde la Ciudad de México hasta un pequeño pueblo en la Provenza para recibir su herencia: un campo de lavanda seco y una libreta con recetas escritas en un código que mezcla francés con náhuatl. Mientras restaura la plantación con la ayuda de Étienne, un silencioso agricultor local, descubre que su abuela fue parte de la Resistencia francesa y que las recetas codifican un mensaje sobre un cargamento de obras de arte robadas por los nazis. Entre lavanda y secretos de guerra, Camille encuentra más de lo que vino a buscar.',
    actors: 'Camila Bordón, Jean Renoir, Marie Dupont, Dominique Palange',
  },
  'Operación Fénix': {
    synopsis: 'El ex-agente de la DEA Marcos Ferrer vive retirado en una playa de Oaxaca cuando recibe un mensaje cifrado que solo él puede descifrar: su antigua unidad fue emboscada en la frontera entre Tailandia y Myanmar y los únicos sobrevivientes están en manos del Cartel del Dragón, una organización que trafica con personas, drogas y artefactos nucleares. Sin apoyo oficial y con 72 horas antes de que ejecuten a sus compañeros, Ferrer debe reclutar a su propio equipo: un ex-SAS británico adicto al juego, una piloto rusa y un contador que resulta ser el mejor tirador que ha conocido.',
    actors: 'Joaquín Cosío, Daniela Castro, Erik Hayser, Kristyan Ferrer',
  },
  'Reino de Hielo': {
    synopsis: 'En un mundo cubierto por un manto de hielo eterno tras el Gran Enfriamiento, una joven llamada Nieve emprende la búsqueda de la legendaria Fuente de Calor, una grieta en el lecho marino que, según los cuentos de su abuela, podría devolver el verdor al mundo. Acompañada por un oso polar parlante que perdió su memoria y un ave mecánica construida por una civilización extinguida, Nieve atraviesa glaciares traicioneros y ciudades congeladas donde aún habitan sombras del pasado. En su viaje descubrirá que el calor no está afuera, sino dentro de ella.',
    actors: 'Voces de: Alan Estrada, Natasha Dupeyrón, Susana Zabaleta',
  },
  'Noche de Juego': {
    synopsis: 'Cada viernes, cinco amigos veintiañeros se reúnen para jugar "Catán" y olvidar que la adultez los está aplastando. Pero esta noche, el anfitrión ha comprado una copia de "La Maldición de Cthulhu", un juego de mesa de edición limitada que encontró en una tienda de antigüedades. Cuando abren la caja, las reglas comienzan a reescribirse solas, las fichas se mueven sin que nadie las toque y una carta les advierte que si alguien pierde, perderá algo más que la partida. Ahora deben terminar el juego antes del amanecer, porque el juego no acepta rendiciones.',
    actors: 'Luis Gerardo Méndez, Mariana Botas, Ricardo Polanco',
  },
  'La Casa del Acantilado': {
    synopsis: 'La familia Lombardo se muda a Villa Soledad, una mansión art nouveau construida en 1927 sobre un acantilado en el Pacífico mexicano. La casa es hermosa, pero tiene una particularidad: en los equinoccios, las ventanas se empañan con mensajes escritos desde adentro. La hija mayor descubre que cada veinte años, en la misma fecha, la familia que habita la casa se desintegra —y el patrón lleva cien años repitiéndose. La única manera de romper el ciclo es entender qué pasó la noche del 21 de marzo de 1927, cuando el arquitecto enloqueció y su esposa desapareció sin dejar rastro.',
    actors: 'Mónica Huarte, Alejandro Calva, Verónica Merchant, Arcelia Ramírez',
  },
  'Camino a Casa': {
    synopsis: 'Toby es un labrador mestizo que viaja con su dueño, un niño de nueve años llamado Mateo, por la carretera Panamericana. Durante una parada en Texas, un incidente los separa. Toby, que nunca ha estado solo, emprende un viaje de tres mil kilómetros de regreso a su hogar en la Ciudad de México. A lo largo del camino, cruza desiertos, ríos y fronteras; encuentra a una coyota solitaria que le enseña a cazar, a un anciano que busca a su nieto perdido y a una joven migrante que protege a su bebé. Es la historia de un perro, pero habla de todos los que buscan regresar.',
    actors: 'Alan Estrada, Cecilia Suárez, Benny Emmanuel',
  },
  'Nómada Digital': {
    synopsis: 'Julián, un desarrollador de software de treinta y dos años, vende todo lo que tiene, compra un boleto de ida al sudeste asiático y comienza a trabajar desde cualquier lugar con WiFi. Entre espacios de coworking en Bali, hostales en Chiang Mai y cafés en Lisboa, conoce a una community manager que huye de una relación tóxica y a un escritor de mediana edad que busca la novela que nunca escribió. Pero el verdadero viaje no es geográfico: Julián descubre que puedes cambiar de país cada semana y seguir escapando del mismo lugar interno.',
    actors: 'Pablo Astiazarán, Sofía Sisniega, Héctor Bonilla',
  },
  'La Última Canción': {
    synopsis: 'La cantante Sofia Garza se retiró de los escenarios hace veinte años, después de la muerte de su madre. Hoy vive en un pueblo pesquero de Sinaloa, dando clases de canto a niños y negándose a cantar para adultos. Cuando le diagnostican un cáncer terminal, su hija la inscribe en un concurso de talentos para adultos mayores sin decirle. La noticia se vuelve viral y el público exige escucharla una vez más. Sofia debe enfrentar su mayor miedo: cantar sin su madre en la primera fila. La última canción no será para el público, será para despedirse.',
    actors: 'Lila Downs, Eugenia León, Benny Ibarra, Regina Torné',
  },
  'Súper Familia': {
    synopsis: 'Los Hernández son una familia mexicana común y corriente hasta que un meteorito cae en su patio trasero. Al día siguiente, papá puede volar (pero solo a un metro del suelo), mamá tiene fuerza sobrehumana (que no puede controlar y rompe todo lo que toca), el hijo adolescente se vuelve invisible (pero solo cuando está asustado, que es siempre) y la hija pequeña habla con los animales (quienes resultan ser increíblemente groseros). Mientras intentan usar sus poderes para salvar el mundo, lo que realmente necesitan salvar es la cena familiar sin destruir la cocina.',
    actors: 'Adal Ramones, Zuria Vega, Emilio Osorio, Jesús Ochoa',
  },
  'Hacker': {
    synopsis: 'Iker, un joven de diecinueve años que pasó su adolescencia entrando a sistemas gubernamentales por diversión, es reclutado por una agencia de seguridad nacional después de que un juez le da a elegir: prisión o servir a su país. Su primera misión: rastrear a "Cero", un hacker fantasma que está infiltrando los sistemas de pago globales con un código que no deja huellas digitales. Pero a medida que Iker se adentra en la investigación, descubre que "Cero" no es un criminal: es un denunciante que intenta evitar una crisis financiera global, y la agencia que lo contrató es la que está detrás del plan.',
    actors: 'Joshua Gutiérrez, Marina de Tavira, Harold Torres',
  },
  'El Último Dragón': {
    synopsis: 'En el reino de Valdoria, los dragones se extinguieron hace mil años cuando el hechicero Maldred absorbió su magia para volverse inmortal. Ahora, Maldred regresa para reclamar el trono, y la única esperanza del reino es un joven campesino llamado Kael, que descubre un huevo de dragón petrificado en una cueva olvidada. Con la ayuda de la bibliotecaria real —una anciana que resulta ser la última Dragontejedora—, Kael debe aprender a cantar en la lengua antigua para devolver la vida al dragón. El problema: el dragón que nace es del tamaño de un perro chihuahua y eructa fuego del tamaño de una cerilla.',
    actors: 'Voces de: Christopher von Uckermann, Maite Perroni, Jesús Ochoa',
  },
  'Punto de Quiebre': {
    synopsis: 'Mario "Toro" Valencia fue campeón nacional de peso pluma hace diez años. Hoy trabaja descargando camiones en la central de abastos y entrena en un gimnasio polvoriento con su hija de doce años como esquiva. Cuando el campeón mundial sufre una lesión a dos semanas de la pelea, el promotor —que le debe dinero a Mario— le ofrece la pelea como pago de la deuda. Con treinta y ocho años, el cuerpo destrozado y una hija que no quiere verlo sangrar más, Mario acepta la pelea más peligrosa de su vida. No pelea por el cinturón: pelea para que su hija no termine como él.',
    actors: 'Tenoch Huerta, Dolores Heredia, Mayra Hermosillo',
  },
  'El Gran Salto': {
    synopsis: 'Jorge "Gravity" Martínez creció en un barrio de Ecatepec donde el cielo se ve gris por la contaminación, pero desde niño miraba las estrellas con un telescopio hecho con tubos de PVC. Cuando la NASA lanza un programa de becas para países latinoamericanos, Jorge compite contra miles de solicitantes. Su ensayo, escrito en una servilleta durante su turno en una taquería, llega a manos del director del programa. Pero el camino no es solo académico: la burocracia, la falta de recursos y las dudas de su propia familia serán obstáculos más difíciles que cualquier examen.',
    actors: 'Emiliano Zurita, Arcelia Ramírez, Hoze Meléndez',
  },
  'Misterio en Venecia': {
    synopsis: 'El detective retirado Lorenzo Montes disfruta su jubilación en Venecia, bebiendo negronis en la Piazza San Marco y fingiendo que no nota los crímenes callejeros. Pero cuando una reconocida soprano aparece muerta en su camerino del Teatro La Fenice durante el tercer acto de "La Traviata", el comisario local —un viejo amigo— le pide ayuda extraoficial. La investigación lleva a Lorenzo por los canales más oscuros de la ciudad, desde palacios decadentes hasta bibliotecas secretas, donde descubre que la soprano no fue asesinada por celos, sino por un secreto que conecta a las familias más poderosas de Venecia con el saqueo de obras de arte durante la guerra.',
    actors: 'Demián Bichir, Kate del Castillo, Alejandro de la Madrid',
  },
  'Planeta Salvaje': {
    synopsis: 'El documentalista de naturaleza Gael Rocha pasa seis meses solo en la selva del Darién, filmando una especie de jaguar albino que los indígenas emberá consideran una deidad. Equipado con cámaras trampa, un dron y su instinto, Gael logra capturar imágenes que ninguna cámara había filmado antes. Pero el jaguar no es lo único que encuentra: descubre un campamento abandonado de minería ilegal que opera dentro de una reserva natural protegida, y una comunidad indígena que fue desplazada por los mineros. Gael debe decidir si su papel es filmar la belleza o documentar el crimen.',
    actors: 'Carlos Aragón, Xóchitl Gómez, Noé Hernández',
  },
  'Amigas por Siempre': {
    synopsis: 'Tres mujeres de cuarenta años —una abogada exitosa, una artista frustrada y una madre dedicada— se reencuentran en la casa de la infancia después de veinte años sin verse, convocadas por una carta que les dejó su mejor amiga del grupo antes de morir. La carta contiene instrucciones para cumplir las promesas que se hicieron a los doce años: viajar juntas, abrir un negocio y reconciliarse con alguien del pasado. Lo que no saben es que la carta es también un mapa para encontrar un tesoro que enterraron cuando niñas, y que el tesoro es la única pista para entender por qué su amiga decidió irse.',
    actors: 'Maya Zapata, Ana Claudia Talancón, Cecilia Suárez, Luisa Huertas',
  },
  'Latidos del Corazón': {
    synopsis: 'El doctor Emilio Rivas, uno de los cardiólogos más prestigiosos del país, recibe un caso que cambiará su vida: Valeria, una bailarina de flamenco de treinta años, necesita un trasplante de corazón urgente. Emilio, que perdió a su esposa por la misma condición cinco años atrás, se involucra más allá de lo profesional. Mientras Valeria espera en la lista de trasplantes, Emilio descubre que el corazón compatible perfecto pertenece a un donante que está en muerte cerebral en el mismo hospital: la hija de la mujer que causó la muerte de su esposa.',
    actors: 'Maxi Iglesias, Bárbara de Regil, Adriana Louvier',
  },
  'Eclipse': {
    synopsis: 'Valeria nunca ha creído en lo sobrenatural, pero durante el eclipse solar total que oscurece su ciudad por cuatro minutos, sufre una crisis epiléptica y despierta con una habilidad que no puede explicar: al tocar objetos antiguos, ve fragmentos del pasado de quienes los tocaron. Cuando la policía encuentra el cuerpo de una mujer en el lago de Xochimilco con una medalla del siglo XVIII en el cuello, Valeria toca la medalla y ve el asesinato como si estuviera allí. Ahora debe convencer a una detective escéptica de que su don es real antes de que el asesinato del pasado se repita en el presente.',
    actors: 'Ana Serradilla, Marco Treviño, Cassandra Ciangherotti',
  },
  'Rebaño': {
    synopsis: 'Siete excursionistas universitarios deciden escalar el Cerro de la Muerte en Costa Rica durante las vacaciones de Semana Santa, ignorando las advertencias de los lugareños sobre una manada de lobos que ha estado bajando de las montañas por la sequía. Cuando una tormenta los obliga a refugiarse en una cabaña abandonada, descubren que los lobos no están cazando por hambre: algo los está conduciendo. A medida que la noche avanza y el grupo se reduce, el líder del grupo comienza a sospechar que entre ellos hay alguien que no es quien dice ser, y que la manada no es el peligro más grande en la montaña.',
    actors: 'Aldo Escalante, Natalia Téllez, Pablo Abitia',
  },
  'El Inventor': {
    synopsis: 'Don Matías es un inventor de setenta años que pasa sus días en el taller de su casa, construyendo artefactos inútiles que su esposa amenaza con tirar a la basura. Pero un día logra lo imposible: construye una máquina que materializa los sueños. El problema es que la máquina no distingue entre sueños y pesadillas. Cuando su nieta sueña con un gigante de fuego, el gigante aparece en medio de la sala. Ahora Don Matías, su esposa y su nieta deben recorrer la ciudad recolectando los sueños extraviados antes de que el más terrorífico se haga realidad y destruya la ciudad.',
    actors: 'Daniel Giménez Cacho, Luisa Huertas, Ana Ofelia Murguía',
  },
  'Al Filo del Tiempo': {
    synopsis: 'El físico teórico Diego Sandoval completa su máquina del tiempo en un laboratorio secreto de la UNAM. Cuando hace un salto de prueba de cinco minutos, algo sale mal: la máquina lo lanza al año 1847, en plena invasión estadounidense, y el dispositivo de retorno queda dañado. Mientras repara la máquina escondido en un convento, conoce a una joven que le recuerda a su esposa, y descubre que ella morirá en la batalla de Chapultepec si él no interviene. Pero cada alteración que hace en el pasado provoca tormentas temporales que podrían borrar su propia existencia.',
    actors: 'Alfonso Dosal, Esmeralda Pimentel, Ernesto Gómez Cruz',
  },
  'Rescate en Altamar': {
    synopsis: 'El crucero de lujo "Poseidón" navega por el Pacífico con dos mil pasajeros a bordo cuando una tormenta categoría 4 lo alcanza y el sistema de navegación falla. El capitán, en estado de pánico, abandona el puente. El equipo de rescate liderado por la comandante Marina Soto debe llegar al barco en helicóptero en medio del huracán mientras el crucero se inclina peligrosamente a treinta grados. Dentro del barco, una madre soltera, un exmilitar con TEPT pos traumático y un mecánico retirado deben organizar a los pasajeros para llegar a la cubierta superior antes de que el barco se parta en dos.',
    actors: 'Jorge Salinas, Alicia Machado, Kuno Becker, Irán Castillo',
  },
  'Hechizo de Luna': {
    synopsis: 'Luna es una bruja del siglo XXI que trabaja en una tienda de velas aromáticas en la Condesa mientras oculta sus poderes de sus clientes hipsters. Su especialidad: hechizos de amor que no fallan. El problema es que ella nunca ha podido aplicarse uno a sí misma porque el aquelarre le prohibió enamorarse de un humano. Cuando conoce a Mateo, un biólogo evolutivo que viene a la tienda a comprar incienso para sus investigaciones y que literalmente no cree en nada que no pueda medir, Luna descubre que la magia más poderosa no cabe en ningún hechizo.',
    actors: 'Altair Jarabo, Juan Ferrara, Regina Blandón',
  },
  'Zombielandia': {
    synopsis: 'Cuando un virus experimental del laboratorio de virología más grande de América Latina escapa al sistema de drenaje, la Ciudad de México amanece con los primeros infectados: personas que atacan sin razón y no sienten dolor. Un grupo de sobrevivientes —una doctora del IMSS, un conductor de Uber, una chef de comida callejera y un youtuber de conspiracy theories— se refugia en el centro comercial más grande de la ciudad. Desde la azotea ven cómo la ciudad que conocen se desmorona, y descubren que el gobierno ha sellado todas las salidas. Su única esperanza es llegar al lago de Chapultepec, donde un helicóptero militar promete evacuación.',
    actors: 'Mario Escalante, Carmen Aub, Luis Arrieta, Mauricio Isaac',
  },
  'Bajo Cero': {
    synopsis: 'La base antártica Esperanza, la más remota del continente, opera con una tripulación mínima durante el invierno polar, cuando el sol no sale por cuatro meses. El biólogo Martín Uribe perfora el hielo milenario y extrae una muestra que contiene una bacteria con una estructura celular nunca antes vista. Al descongelarse lentamente en el laboratorio, el organismo no solo revive: comienza a replicarse y a modificar genéticamente todo lo que toca, incluyendo a los miembros de la base. La comunicación con el exterior está cortada por la tormenta, y la única salida es atravesar el desierto blanco en la oscuridad total.',
    actors: 'Humberto Busto, Sofía Garza, Gerardo Taracena',
  },
  'La Receta Secreta': {
    synopsis: 'Elena, una chef mexicana especializada en mole, recibe una invitación para competir en el "International Fusion Championship" en Tokio, donde los mejores chefs del mundo fusionan cocinas tradicionales. Su rival más fuerte: Takashi, un chef japonés que ha pasado veinte años perfeccionando el ramen y que desprecia la cocina mexicana por considerarla "poco refinada". Elena descubre que el abuelo de Takashi vivió en México durante la Segunda Guerra Mundial y dejó un recetario de fusión japonesa-mexicana que nunca se publicó. La receta secreta no es un platillo: es la historia de una amistad entre dos cocinas que el mundo dividió.',
    actors: 'Regina Blandón, Hiroshi Takahashi, Luis Fernando Peña',
  },
  'Desaparecida': {
    synopsis: 'Sofía Rangel, madre soltera de dos hijos, vive en Ciudad Juárez. Su hija mayor, Mariana de diecisiete años, sale del trabajo a las diez de la noche y nunca llega a casa. La policía le dice que espere cuarenta y ocho horas. Cuando Sofía intenta levantar la denuncia, nadie la toma en serio: su hija es una de muchas. Decidida a no esperar, Sofía aprende a rastrear teléfonos, infiltrarse en chats de tráfico de personas y seguir pistas que la llevan a una red de trata que opera entre México y Estados Unidos. Basada en hechos reales, Sofía recorrerá el camino que ninguna madre debería recorrer.',
    actors: 'Kate del Castillo, Lisa Owen, Tiaré Scanda, Mayra Sérbulo',
  },
  'Luna de Sangre': {
    synopsis: 'En el pueblo de San Miguel de Allende, la leyenda cuenta que durante la luna de sangre, el espíritu de La Llorona regresa no para llorar por sus hijos, sino para llevarse a los vivos. Todo el mundo lo considera un cuento para turistas hasta que una noche de luna roja, tres adolescentes desaparecen sin dejar rastro. Al año siguiente, en la misma fecha, desaparecen cinco más. La única sobreviviente del primer año, que escapó con la mente destrozada, balbucea una advertencia: "No es una llorona, es una madre buscando lo que le robaron".',
    actors: 'Maya Mishalska, Alejandro Speitzer, Ana Bertha Espín',
  },
  'El Vuelo del Colibrí': {
    synopsis: 'Emiliano es un niño de nueve años que nació sordo y vive en un pueblo donde nadie sabe lengua de señas. Comunicándose a través de dibujos, encuentra un colibrí herido en el bosque y lo cuida en secreto. El colibrí, mágico, le enseña un lenguaje de colores y movimientos que le permite "escuchar" el mundo de otra manera. Cuando una empresa maderera ilegal comienza a talar el bosque, Emiliano y su colibrí deben advertir al pueblo. Pero nadie toma en serio a un niño que no puede hablar. El colibrí, sin embargo, tiene un plan que involucra a todo el bosque.',
    actors: 'Voces de: Ianis Guerrero, Leticia Calderón, Juan Carlos Colombo',
  },
  '8 Segundos': {
    synopsis: 'Gabriel "Gabe" Navarro es el mejor jinete de rodeo de su generación, capaz de permanecer ocho segundos sobre cualquier toro bravo. Pero después de una caída que casi lo mata y le deja placas de titanio en la columna, su esposa le exige que se retire. Cuando el toro que casi lo mata —"Asesino", un animal invicto de media tonelada— es programado para la última competencia de la temporada, Gabriel siente que debe montarlo una vez para recuperar algo que perdió en la caída: no el orgullo, sino el coraje de enfrentar lo que le da miedo. Su esposa lo ve partir sabiendo que quizá no regrese.',
    actors: 'Brandon Peniche, Irina Baeva, Alejandro Ávila',
  },
  'Mi Amigo el Robot': {
    synopsis: 'Pablo es un niño solitario que vive con su abuela en una colonia popular de la Ciudad de México. En el tiradero de basura electrónica local, encuentra piezas de computadoras viejas y, siguiendo un tutorial de YouTube, arma un robot del tamaño de un perro salchicha. Cuando conecta la última pieza, el robot —al que llama "Chispas"— cobra vida de manera inexplicable. Chispas aprende rápido, pero tiene una falla: cada vez que miente, le sale humo de los oídos. Juntos, Pablo y Chispas encontrarán una manera de salvar la casa de la abuela de la gentrificación que amenaza con desplazarlos.',
    actors: 'Hanssel Casillas, Mauricio Islas, Carmen Montejo',
  },
  'Amor de Café': {
    synopsis: 'Daniela hereda "El Aroma", una cafetería tradicional en la calle más pintoresca de la colonia Roma, justo enfrente de "Brew Lab", una cafetería de especialidad moderna manejada por Mateo, un barista certificado que tuesta sus propios granos y menosprecia el café de "cápsulas". La guerra de cafeterías escala: él ofrece catas de café etíope, ella responde con pan dulce recién horneado de la receta de su abuela. Entre chemex y espresso, los clientes comienzan a hacer apuestas sobre cuándo se besarán. Todo el barrio lo sabe menos ellos.',
    actors: 'Livia Brito, Andrés Palacios, Angélica Vale',
  },
  'Contrarreloj': {
    synopsis: 'El teniente Alejandro Muro, el mejor experto en desactivación de explosivos del ejército mexicano, recibe una llamada a las 6:00 a.m.: un artefacto nuclear ha sido instalado en el sótano de la Torre Mayor, el edificio más alto de la Ciudad de México. Tiene doce horas para desactivarlo. Pero el artefacto no es un mecanismo convencional: el terrorista que lo diseñó es su antiguo instructor, un hombre que perdió a su familia en un ataque con drones y que conoce cada una de las técnicas de Muro. Cada cable cortado es una decisión entre salvar la ciudad o permitir que la justicia —como él la entiende— se cumpla.',
    actors: 'Eduardo Capetillo, Azela Robinson, José María Yazpik',
  },
  'El Legado': {
    synopsis: 'Cuando el patriarca de la familia Zaldívar muere, su hijo menor, Andrés, regresa a la hacienda familiar en San Luis Potosí para el funeral. La lectura del testamento revela que la herencia no es la tierra ni el dinero, sino un secreto: la hacienda fue construida sobre un antiguo cementerio de la guerra cristera, y el abuelo era el único que sabía dónde enterraron a los fusilados. Un arqueólogo forense llega al pueblo para exhumar los cuerpos, pero los habitantes —incluyendo la propia familia de Andrés— prefieren que los muertos sigan muertos. Andrés debe elegir entre la verdad histórica y la paz de su familia.',
    actors: 'Osvaldo Benavides, Angelique Boyer, Alejandro Tommasi',
  },
  'Aventura Prehistórica': {
    synopsis: 'Durante una excursión escolar al museo de paleontología, cuatro niños de quinto grado tocan un diente de Tiranosaurio Rex que resultó ser un artefacto temporal disfrazado de fósil. En un destello, aparecen en el Cretácico tardío, a sesenta y seis millones de años de casa. Sin celulares, sin adultos y con solo una mochila con lunch, los niños deben sobrevivir entre dinosaurios reales usando lo único que tienen: sus conocimientos de ciencia (gracias a un profesor de biología amante de Jurassic Park). El camino de regreso está en la cima de un volcán activo, y tienen hasta el atardecer.',
    actors: 'Voces de: Emilio Treviño, Regina Orozco, Jesús Ochoa',
  },
  'Ciudad de Cristal': {
    synopsis: 'El arquitecto Santiago Fernández tiene un sueño: construir una ciudad autosuficiente en medio del desierto de Sonora, alimentada por energía solar y agua reciclada, donde la gente viva en armonía con el entorno. Consigue financiamiento de un fondo verde internacional y comienza la construcción. Pero el gobierno local, los cárteles de la tierra y una corporación minera que explota litio en la zona se confabulan para detenerlo. Cuando su mejor amigo y socio aparece muerto en un "accidente" de construcción, Santiago descubre que la ciudad de cristal no se construye sobre arena, se construye sobre sangre.',
    actors: 'Diego Luna, Irene Azuela, Damián Alcázar, Karina Gidi',
  },
};

export const enhance = mutation({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    let updated = 0;

    for (const movie of movies) {
      const enhanced = ENHANCED_MOVIES[movie.name];
      if (enhanced) {
        await ctx.db.patch(movie._id, {
          synopsis: enhanced.synopsis,
          actors: enhanced.actors,
        });
        updated++;
      }
    }

    return { updated, total: movies.length };
  },
});
