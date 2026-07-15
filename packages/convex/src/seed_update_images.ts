import { mutation } from './_generated/server';

const TOKEN_IMAGE_MAP: Record<string, string> = {
  'ultimo-horizonte': '/peliculas/ultimo-horizonte.webp',
  'sombras-pasado': '/peliculas/sombras-pasado.webp',
  'risas-cadena': '/peliculas/risas-cadena.webp',
  'corazon-fuego': '/peliculas/corazon-fuego.webp',
  'bosque-susurrante': '/peliculas/bosque-susurrante.webp',
  'aventura-cumbre': '/peliculas/aventura-cumbre.webp',
  'dibujos-animados': '/peliculas/dibujos-animados.webp',
  'codigo-rojo': '/peliculas/codigo-rojo.webp',
  'juicio-final': '/peliculas/juicio-final.webp',
  'ultima-frontera': '/peliculas/ultima-frontera.webp',
  'noche-mentiras': '/peliculas/noche-mentiras.webp',
  'enigma-faraon': '/peliculas/enigma-faraon.webp',
  'tormenta-inminente': '/peliculas/tormenta-inminente.webp',
  'lazos-sangre': '/peliculas/lazos-sangre.webp',
  'cupido-electrico': '/peliculas/cupido-electrico.webp',
  'panico': '/peliculas/panico.webp',
  'ritmo-salvaje': '/peliculas/ritmo-salvaje.webp',
  'traves-espejo': '/peliculas/traves-espejo.webp',
  'guerra-vecinos': '/peliculas/guerra-vecinos.webp',
  'mar-profundo': '/peliculas/mar-profundo.webp',
  'secreto-abuela': '/peliculas/secreto-abuela.webp',
  'galaxia-perdida': '/peliculas/galaxia-perdida.webp',
  'amor-primera-linea': '/peliculas/amor-primera-linea.webp',
  'mas-alla-razon': '/peliculas/mas-alla-razon.webp',
  'rio-lavanda': '/peliculas/rio-lavanda.webp',
  'operacion-fenix': '/peliculas/operacion-fenix.webp',
  'reino-hielo': '/peliculas/reino-hielo.webp',
  'noche-juego': '/peliculas/noche-juego.webp',
  'casa-acantilado': '/peliculas/casa-acantilado.webp',
  'camino-casa': '/peliculas/camino-casa.webp',
  'nomada-digital': '/peliculas/nomada-digital.webp',
  'ultima-cancion': '/peliculas/ultima-cancion.webp',
  'super-familia': '/peliculas/super-familia.webp',
  'hacker': '/peliculas/hacker.webp',
  'ultimo-dragon': '/peliculas/ultimo-dragon.webp',
  'punto-quiebre': '/peliculas/punto-quiebre.webp',
  'gran-salto': '/peliculas/gran-salto.webp',
  'misterio-venecia': '/peliculas/misterio-venecia.webp',
  'planeta-salvaje': '/peliculas/planeta-salvaje.webp',
  'amigas-siempre': '/peliculas/amigas-siempre.webp',
  'latidos-corazon': '/peliculas/latidos-corazon.webp',
  'eclipse': '/peliculas/eclipse.webp',
  'rebano': '/peliculas/rebano.webp',
  'inventor': '/peliculas/inventor.webp',
  'filo-tiempo': '/peliculas/filo-tiempo.webp',
  'rescate-altamar': '/peliculas/rescate-altamar.webp',
  'hechizo-luna': '/peliculas/hechizo-luna.webp',
  'zombielandia': '/peliculas/zombielandia.webp',
  'bajo-cero': '/peliculas/bajo-cero.webp',
  'receta-secreta': '/peliculas/receta-secreta.webp',
  'desaparecida': '/peliculas/desaparecida.webp',
  'luna-sangre': '/peliculas/luna-sangre.webp',
  'vuelo-colibri': '/peliculas/vuelo-colibri.webp',
  '8-segundos': '/peliculas/8-segundos.webp',
  'amigo-robot': '/peliculas/amigo-robot.webp',
  'amor-cafe': '/peliculas/amor-cafe.webp',
  'contrarreloj': '/peliculas/contrarreloj.webp',
  'legado': '/peliculas/legado.webp',
  'aventura-prehistorica': '/peliculas/aventura-prehistorica.webp',
  'ciudad-cristal': '/peliculas/ciudad-cristal.webp',
};

export const updateImages = mutation({
  args: {},
  handler: async (ctx) => {
    const movies = await ctx.db.query('movies').collect();
    let updated = 0;

    for (const movie of movies) {
      const newImage = TOKEN_IMAGE_MAP[movie.token];
      if (newImage && movie.image !== newImage) {
        await ctx.db.patch(movie._id, { image: newImage });
        updated++;
      }
    }

    return { updated, total: movies.length };
  },
});
