import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HASH_TO_TOKEN = {
  '0000b3fba156e936652ca4b8f735a64d': 'ultimo-horizonte',
  '006483860247b5e9b0ce6f35fea2b32c': 'sombras-pasado',
  '0183509066aed09ff9f54e82ac039686': 'risas-cadena',
  '023713c7ddee53e92166309f2f253f9b': 'corazon-fuego',
  '02f7bc05e8817ce8fdcdbfd82178fabe': 'bosque-susurrante',
  '0347333f16f5e6e448fd5e66b67a5337': 'aventura-cumbre',
  '035f610eeab81d0d8bbf12b28934e7ce': 'dibujos-animados',
  '0365c6e135228bb780baa2e2850f7a45': 'codigo-rojo',
  '037637b9d916f75712b2291e0f1e81e8': 'juicio-final',
  '03b895b7f6d18478f3583560329f75e2': 'ultima-frontera',
  '03dacc8f326ea8582d9ddd8c3625e78d': 'noche-mentiras',
  '03ee585dcd77400a36811f86b3182ec4': 'enigma-faraon',
  '04269267412804b665cc06b4a46e910e': 'tormenta-inminente',
  '049516a1450e3eab0b1995767af3cdc5': 'lazos-sangre',
  '04e2ee798ec558052a466c2b8eeda217': 'cupido-electrico',
  '0528fc979f337c004499aee6ec873f13': 'panico',
  '052f0a67afbc3733a0942c5c93c91c84': 'ritmo-salvaje',
  '067830b50b3b0938f0b271955c08d648': 'traves-espejo',
  '06a6b550e1efe195c1a529dcca5f31d5': 'guerra-vecinos',
  '07319ca23a6c6df4016b70263e0340eb': 'mar-profundo',
  '0753cd0c164677e6d80b5d7ff5541e89': 'secreto-abuela',
  '0755080a57790a1a6825774d11b4658b': 'galaxia-perdida',
  '07825ac605209d3adb3e196de9bf247b': 'amor-primera-linea',
  '084c4ab1442541d2590ab7c35a26af67': 'mas-alla-razon',
  '08d73e528b55facc929b3b6f95033ca5': 'rio-lavanda',
  '08de713e8d62d3c48bac7cec3648e63d': 'operacion-fenix',
  '09071a32c9230b7e7cd6d6d1d27495e0': 'reino-hielo',
  '099df22cd6a00dd4a53ea601408e9e81': 'noche-juego',
  '0a141553b8ccb77955b893b66549254d': 'casa-acantilado',
  '0a435e664b5060e081b88016e62b6e0a': 'camino-casa',
  '0a8f87399f316edef0f1719f5395b904': 'nomada-digital',
  '0a9fd79232f54b576b1ea7a4dc0420f0': 'ultima-cancion',
  '0ab65f7ce543464329f381b327455303': 'super-familia',
  '0b0aef502ef9924094ccf53b31964c3d': 'hacker',
  '0b285936e9bcc4ee3b0fb58806ad6b32': 'ultimo-dragon',
  '0b32bfc4305adcd32873dc7eaf9eeb62': 'punto-quiebre',
  '0b7c8787a4c13516f37767fdc47daf7f': 'gran-salto',
  '0cd731ea006cb2eba694d38bada7f590': 'misterio-venecia',
  '0ce129ce35a474be3930eba77cb2b4d4': 'planeta-salvaje',
  '0d11fdb9ea372e9f95dbe4a1d97b80bd': 'amigas-siempre',
  '0d194babc19417e38e1858d6138cecb5': 'latidos-corazon',
  '0d8799f858e87ba1c91ac0a1827b3e40': 'eclipse',
  '0d8ba55b2a2fe23ae481fc39c4488b03': 'rebano',
  '0ddf556bc567f65c1fe1d15615ec8b9f': 'inventor',
  '0df2d41ccf1d0829e66270fde1dc4f0e': 'filo-tiempo',
  '0e11c3efda5aa2e43bc517d2892425fa': 'rescate-altamar',
  '0f1996a3e6ca102cd84f9fd0a7723775': 'hechizo-luna',
  '0f4a99d6ae47368e3411883b5f764f59': 'zombielandia',
  '0f90cac0f9b7844c05039a715f4e8e9e': 'bajo-cero',
  '0fe1ba618bc138117bbf8878a6e80424': 'receta-secreta',
  '1019858890862593aa3590a50cb68d6d': 'desaparecida',
  '10697d298146ebabb240270b26e97ff0': 'luna-sangre',
  '1094b6183be9787bc7f03b7726b7c1c4': 'vuelo-colibri',
  '1107e57405c793343cd37aee7e51345b': '8-segundos',
  '11683a436bf0cbb0e111e89c0c5dfe76': 'amigo-robot',
  '117638057565aae69f5c0eeddfdd7012': 'amor-cafe',
  '118af4943980ccc621f70636d58e9193': 'contrarreloj',
  '11bb135e6a470f7df1f0df9757b61ef9': 'legado',
  '11cd0ccbe414cad4e6cdcecfa80af801': 'aventura-prehistorica',
  '11fa95f8f05f09fb65a803156f8a5ec7': 'ciudad-cristal',
};

const seedPath = resolve(__dirname, '..', 'packages/convex/src/seed.ts');
let content = readFileSync(seedPath, 'utf-8');

for (const [hash, token] of Object.entries(HASH_TO_TOKEN)) {
  const oldStr = `image: '${hash}'`;
  const newStr = `image: '/peliculas/${token}.webp'`;
  content = content.replaceAll(oldStr, newStr);
}

writeFileSync(seedPath, content, 'utf-8');
console.log('✓ seed.ts updated with new image paths');
