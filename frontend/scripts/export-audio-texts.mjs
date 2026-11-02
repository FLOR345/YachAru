// Lista lo que la interfaz pronuncia desde sus propios archivos (cuerpo, números, ejemplos, cultura),
// para que el proceso MMS también le genere voz. Uso: node scripts/export-audio-texts.mjs <salida.json>
import fs from 'node:fs';
import { PARTES, partesDe, frasesParte, numeroEn } from '../src/data/cuerpoNumeros.js';
import { conExtras } from '../src/data/culturaExtra.js';

const output = process.argv[2];
if (!output) {
  console.error('Indica el archivo de salida');
  process.exit(1);
}

const ejemplos = JSON.parse(fs.readFileSync(new URL('../src/data/ejemplos.json', import.meta.url), 'utf8'));
const CULTURA = ['adivinanza', 'proverbio', 'cancion'];

const texts = {};
for (const idioma of ['quechua', 'aymara']) {
  const list = new Set();
  for (const part of partesDe(idioma)) {
    const phrases = frasesParte(part, idioma);
    list.add(part[idioma]).add(phrases.es.original).add(phrases.toca.original);
  }
  for (let n = 1; n <= 100; n += 1) list.add(numeroEn(n, idioma));
  list.add(numeroEn(1000, idioma));
  for (const tipo of CULTURA) for (const item of conExtras(tipo, [], idioma)) list.add(item.contenido_original);
  for (const [original] of Object.values(ejemplos[idioma] ?? {})) list.add(original);
  list.delete('');
  list.delete(undefined);
  texts[idioma] = [...list];
}

fs.writeFileSync(output, JSON.stringify(texts));
console.log(Object.entries(texts).map(([id, list]) => `${id}: ${list.length} textos`).join(', '), `(${PARTES.length} partes del cuerpo)`);
