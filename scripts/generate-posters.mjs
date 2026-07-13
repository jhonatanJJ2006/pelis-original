import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'apps', 'web', 'public', 'peliculas');

mkdirSync(OUT_DIR, { recursive: true });

const MOVIES = [
  { token: 'ultimo-horizonte', genre: 'Ciencia', synopsis: 'Un astronauta varado solo en una base espacial en un planeta lejano recibe una señal de radio misteriosa. Planetas alienígenas, estrellas, traje espacial dañado, soledad del cosmos.' },
  { token: 'sombras-pasado', genre: 'Suspenso', synopsis: 'Una detective investiga desapariciones en un pueblo oscuro. Iglesia antigua, niebla, farol, secretos enterrados, atmósfera opresiva.' },
  { token: 'risas-cadena', genre: 'Comedia', synopsis: 'Tres amigos abren un club de comedia en una lavandería abandonada. Micrófono, escenario improvisado, público pequeño, colores cálidos y vibrantes.' },
  { token: 'corazon-fuego', genre: 'Romance', synopsis: 'Toscana 1945, una chef italiana y un soldado estadounidense. Restaurante rústico, olivos, atardecer dorado, amor en tiempos de guerra.' },
  { token: 'bosque-susurrante', genre: 'Terror', synopsis: 'Adolescentes perdidos en un bosque encantado donde los árboles susurran. Niebla espesa, árboles retorcidos, luna llena, linterna.' },
  { token: 'aventura-cumbre', genre: 'Aventura', synopsis: 'Un chef y una montañista retirada escalan los Pirineos para salvar un refugio alpino. Montañas nevadas, picos, cuerdas, cielo tormentoso.' },
  { token: 'dibujos-animados', genre: 'Animación', synopsis: 'Un niño descubre que sus dibujos cobran vida al apagarse la luz. Crayones coloridos, criatura azul, cohete de cartón, habitación infantil mágica.' },
  { token: 'codigo-rojo', genre: 'Acción', synopsis: 'Equipo de élite se infiltra en una fortaleza subterránea para detener un ciberataque nuclear. Soldados tácticos, pantallas holográficas, pasillos oscuros.' },
  { token: 'juicio-final', genre: 'Drama', synopsis: 'Un abogado defiende a su mejor amigo acusado de asesinato con trastorno de identidad. Tribunal, expedientes, miradas cruzadas, tensión.' },
  { token: 'ultima-frontera', genre: 'Ciencia', synopsis: 'Futuro distópico donde una IA gobierna la humanidad. Ciudad subterránea, luces de neón, resistentes, tecnología opresiva.' },
  { token: 'noche-mentiras', genre: 'Comedia', synopsis: 'Una cena familiar explota cuando un juego de mesa revela secretos. Mesa familiar, expresión de shock, platos de comida, velas.' },
  { token: 'enigma-faraon', genre: 'Aventura', synopsis: 'Una arqueóloga descubre una cámara secreta bajo la Gran Pirámide. Tumba egipcia, jeroglíficos, antorchas, tesoro dorado.' },
  { token: 'tormenta-inminente', genre: 'Acción', synopsis: 'Un meteorólogo lucha para que su ciudad crea en un huracán categoría 5. Radar climático, nubes oscuras, viento, ciudad en peligro.' },
  { token: 'lazos-sangre', genre: 'Drama', synopsis: 'Dos hermanos gemelos separados al nacer se reencuentran en un hospital. Cirugía, hermanos, sala de hospital, emoción contenida.' },
  { token: 'cupido-electrico', genre: 'Romance', synopsis: 'Una ingeniera crea una app de citas con IA que manipula perfiles. Código brillante, teléfono, corazón digital, laboratorio moderno.' },
  { token: 'panico', genre: 'Terror', synopsis: 'Familia atrapada en una casa rural donde una entidad vive en las paredes. Casa vieja, sombras, velas, tormenta eléctrica, niño mirando la pared.' },
  { token: 'ritmo-salvaje', genre: 'Drama', synopsis: 'Un breaker de Tepito compite en la final mundial de breakdance. Baile callejero, grafiti, reflectores, movimiento congelado.' },
  { token: 'traves-espejo', genre: 'Ciencia', synopsis: 'Una física cuántica cruza un portal hacia un universo paralelo. Espejo distorsionado, partículas cuánticas, luz azul, dos versiones de la misma mujer.' },
  { token: 'guerra-vecinos', genre: 'Comedia', synopsis: 'Dos familias compiten por el premio al mejor jardín. Jardín caótico, mangueras, cercas, vecinos enojados, plantas exóticas.' },
  { token: 'mar-profundo', genre: 'Aventura', synopsis: 'Un biólogo marino descubre una civilización de cefalópodos inteligentes en la fosa de las Marianas. Submarino, bioluminiscencia, océano profundo, criaturas brillantes.' },
  { token: 'secreto-abuela', genre: 'Drama', synopsis: 'Una nieta hereda una casa y descubre el diario de su abuela sobre un amor revolucionario. Casa antigua, diario, fotos sepia, pueblo mexicano.' },
  { token: 'galaxia-perdida', genre: 'Ciencia', synopsis: 'Nave interestelar perdida a millones de años luz de casa. Nave espacial dañada, agujero de gusano, tripulación asustada, estrellas distantes.' },
  { token: 'amor-primera-linea', genre: 'Romance', synopsis: 'Una escritora anónima se enamora del actor que protagoniza la adaptación de su novela. Librería, libros, miradas cómplices, firmas de autógrafos.' },
  { token: 'mas-alla-razon', genre: 'Suspenso', synopsis: 'Un psiquiatra investiga a un paciente que dice la verdad sobre realidades alternas. Consultorio, expresión perturbada, papeles, luz tenue.' },
  { token: 'rio-lavanda', genre: 'Romance', synopsis: 'Una mexicana en la Provenza restaura un campo de lavanda y descubre un secreto de la Resistencia. Campos de lavanda, atardecer, bicicleta, casa de piedra.' },
  { token: 'operacion-fenix', genre: 'Acción', synopsis: 'Ex-agente rescata a su antigua unidad en manos de un cartel en Tailandia. Jungla, mercenarios, helicóptero, explosiones, equipo táctico.' },
  { token: 'reino-hielo', genre: 'Animación', synopsis: 'Una joven busca la fuente de calor en un mundo congelado. Glaciar, oso polar parlante, cielo estrellado, ciudad congelada.' },
  { token: 'noche-juego', genre: 'Comedia', synopsis: 'Amigos juegan un juego de mesa maldito que cobra vida propia. Dados, fichas, mesa de juego, velas, expresión de terror.' },
  { token: 'casa-acantilado', genre: 'Terror', synopsis: 'Familia se muda a una mansión en un acantilado con un ciclo de muerte cada 20 años. Mansión gótica, acantilado, olas, ventanas empañadas.' },
  { token: 'camino-casa', genre: 'Aventura', synopsis: 'Un perro recorre 3000 km para reencontrarse con su dueño. Perro labrador, carretera, desierto, atardecer, lealtad.' },
  { token: 'nomada-digital', genre: 'Drama', synopsis: 'Un programador viaja por el mundo trabajando remotamente buscando la felicidad. Laptop, playa, mochila, atardecer tropical, nómada.' },
  { token: 'ultima-cancion', genre: 'Drama', synopsis: 'Una cantante retirada vuelve a los escenarios para despedirse de su madre. Escenario vacío, micrófono, reflector, mujer mayor, emoción.' },
  { token: 'super-familia', genre: 'Comedia', synopsis: 'Familia mexicana normal obtiene superpoderes por un meteorito. Familia volando, meteorito, poderes coloridos, ciudad de fondo.' },
  { token: 'hacker', genre: 'Suspenso', synopsis: 'Joven hacker reclutado por el gobierno descubre que la agencia es la verdadera amenaza. Código verde, múltiples pantallas, capucha, luces de servidores.' },
  { token: 'ultimo-dragon', genre: 'Animación', synopsis: 'Un campesino revive al último dragón que es del tamaño de un perro. Dragón pequeño, castillo, bosque mágico, chico con armadura.' },
  { token: 'punto-quiebre', genre: 'Drama', synopsis: 'Boxeador en decadencia acepta la pelea más peligrosa de su vida. Ring, boxeador sudoroso, guantes, reflector, mirada determinada.' },
  { token: 'gran-salto', genre: 'Drama', synopsis: 'Joven de Ecatepec cumple su sueño de ser astronauta de la NASA. Telescopio casero, cielo estrellado, cohete, barrio humilde.' },
  { token: 'misterio-venecia', genre: 'Suspenso', synopsis: 'Detective retirado investiga el asesinato de una soprano en La Fenice. Venecia, canales, puentes, góndola, mascarada, teatro.' },
  { token: 'planeta-salvaje', genre: 'Aventura', synopsis: 'Documentalista filma un jaguar albino en la selva del Darién. Selva tropical, jaguar blanco, cámara, vegetación densa.' },
  { token: 'amigas-siempre', genre: 'Comedia', synopsis: 'Tres amigas de la infancia se reencuentran para cumplir promesas de niñas. Tres mujeres abrazadas, casa antigua, álbum de fotos, alegría.' },
  { token: 'latidos-corazon', genre: 'Romance', synopsis: 'Cardiólogo se enamora de una bailarina que necesita trasplante. Hospital, baile flamenco, corazón, médico y paciente, pasión.' },
  { token: 'eclipse', genre: 'Suspenso', synopsis: 'Mujer ve crímenes del pasado al tocar objetos tras un eclipse. Eclipse solar, mujer tocando una medalla, visión fantasmal, lago.' },
  { token: 'rebano', genre: 'Terror', synopsis: 'Excursionistas acosados por una manada de lobos en la montaña. Lobo aullando, cabaña, nieve, luna llena, grupo asustado.' },
  { token: 'inventor', genre: 'Ciencia', synopsis: 'Anciano inventor crea máquina que materializa sueños, incluyendo pesadillas. Taller, engranajes, inventor loco, sueños brillantes, criatura de fuego.' },
  { token: 'filo-tiempo', genre: 'Ciencia', synopsis: 'Físico viaja al México de 1847 y debe evitar alterar la historia. Máquina del tiempo, convento, batalla histórica, soldados.' },
  { token: 'rescate-altamar', genre: 'Acción', synopsis: 'Equipo de rescate salva a pasajeros de un crucero que se hunde en el Pacífico. Crucero inclinado, helicóptero, tormenta, olas gigantes.' },
  { token: 'hechizo-luna', genre: 'Romance', synopsis: 'Bruja moderna en la Condesa se enamora de un científico escéptico. Velas, tienda esotérica, luna llena, pociones, amor urbano.' },
  { token: 'zombielandia', genre: 'Acción', synopsis: 'Apocalipsis zombie en la Ciudad de México, sobrevivientes atrapados en un centro comercial. Zombies, CDMX, centro comercial, barricadas, helicóptero.' },
  { token: 'bajo-cero', genre: 'Terror', synopsis: 'Base antártica donde una bacteria prehistórica muta a los científicos. Base polar, hielo, microscopio, científicos asustados, tormenta blanca.' },
  { token: 'receta-secreta', genre: 'Comedia', synopsis: 'Chef mexicana compite en Tokio fusionando mole con cocina japonesa. Cocina, sushi y mole, delantal, ingredientes, banderas México-Japón.' },
  { token: 'desaparecida', genre: 'Drama', synopsis: 'Madre soltera busca a su hija desaparecida en Ciudad Juárez. Mujer buscando, fotos, carteles de desaparecida, desierto, determinación.' },
  { token: 'luna-sangre', genre: 'Terror', synopsis: 'Leyenda de una madre que busca a sus hijos durante la luna de sangre. Luna roja, pueblo vacío, figura fantasmal, niños desapareciendo.' },
  { token: 'vuelo-colibri', genre: 'Animación', synopsis: 'Niño sordo se comunica con un colibrí mágico para salvar el bosque. Colibrí brillante, niño, bosque, colores vibrantes, lenguaje de señas.' },
  { token: '8-segundos', genre: 'Drama', synopsis: 'Jinete de rodeo debe montar al toro que casi lo mata para recuperar su orgullo. Rodeo, toro bravo, jinete, arena, polvo, multitud.' },
  { token: 'amigo-robot', genre: 'Ciencia', synopsis: 'Niño construye un robot con basura electrónica que cobra vida. Robot pequeño, niño, taller, piezas electrónicas, chispas.' },
  { token: 'amor-cafe', genre: 'Romance', synopsis: 'Dueños de dos cafeterías rivales en la Roma se enamoran. Cafetería acogedora, taza de café, granos, dos personas sonriendo, calle arbolada.' },
  { token: 'contrarreloj', genre: 'Acción', synopsis: 'Experto en explosivos tiene 12h para desactivar una bomba nuclear en la Torre Mayor. Bomba, rascacielos, cable rojo y azul, sudor, tensión.' },
  { token: 'legado', genre: 'Drama', synopsis: 'Hijo hereda una hacienda y descubre un cementerio de la guerra cristera. Hacienda, archivos antiguos, campos, conflicto familiar, tierra.' },
  { token: 'aventura-prehistorica', genre: 'Animación', synopsis: 'Niños viajan al Cretácico y deben sobrevivir entre dinosaurios. Dinosaurios, niños asombrados, volcán, selva prehistórica, aventura.' },
  { token: 'ciudad-cristal', genre: 'Drama', synopsis: 'Arquitecto construye una ciudad sostenible en el desierto enfrentando corrupción. Ciudad de cristal, desierto, planos, maqueta arquitectónica, corrupción.' },
];

const BASE_URL = 'https://image.pollinations.ai/prompt';

function buildPrompt(movie) {
  const style = 'Cinematic movie poster, photorealistic, textless, 2:3 aspect ratio, film lighting, rich colors, professional photography, highly detailed, dramatic composition';

  if (movie.genre === 'Animación') {
    return `${movie.synopsis} Pixar-style animated movie poster, vibrant colors, stylized 3D rendering, whimsical, family-friendly, cinematic lighting, textless, 2:3 aspect ratio`;
  }

  if (movie.genre === 'Comedia') {
    return `${movie.synopsis} Comedy movie poster, warm tones, vibrant, expressive characters, funny situation, cinematic lighting, textless, 2:3 aspect ratio, photorealistic`;
  }

  if (movie.genre === 'Terror') {
    return `${movie.synopsis} Horror movie poster, dark atmosphere, shadows, eerie, cinematic, textless, 2:3 aspect ratio, photorealistic, film grain, muted colors`;
  }

  if (movie.genre === 'Romance') {
    return `${movie.synopsis} Romance movie poster, warm golden light, intimate, passionate, cinematic, textless, 2:3 aspect ratio, photorealistic, soft focus`;
  }

  return `${movie.synopsis} ${style}`;
}

async function downloadImage(url, filepath) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(filepath, buf);
}

async function main() {
  const results = [];

  for (let i = 0; i < MOVIES.length; i++) {
    const movie = MOVIES[i];
    const filepath = resolve(OUT_DIR, `${movie.token}.webp`);

    if (existsSync(filepath)) {
      console.log(`[${i + 1}/${MOVIES.length}] SKIP ${movie.token} — ya existe`);
      results.push({ token: movie.token, status: 'skipped' });
      continue;
    }

    const prompt = buildPrompt(movie);
    const url = `${BASE_URL}/${encodeURIComponent(prompt)}?width=768&height=1152&nologo=true&quality=95`;

    try {
      console.log(`[${i + 1}/${MOVIES.length}] Generando ${movie.token}...`);
      await downloadImage(url, filepath);
      console.log(`  ✓ ${movie.token} guardado`);
      results.push({ token: movie.token, status: 'generated' });
    } catch (err) {
      console.error(`  ✗ ${movie.token} falló: ${err.message}`);
      results.push({ token: movie.token, status: 'failed', error: err.message });
    }

    if (i < MOVIES.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const summary = {
    total: MOVIES.length,
    generated: results.filter(r => r.status === 'generated').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    failed: results.filter(r => r.status === 'failed').length,
  };
  console.log('\n=== Resumen ===');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error);
