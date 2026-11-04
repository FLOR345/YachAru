// Partes del cuerpo y números en quechua (collao/cusqueño) y aimara, para la sección "Mi cuerpo y los números".
// art: artículo en castellano; vista: frente o espalda de la ilustración.
// Frases: "Este es mi…" (Kayqa umaymi / Akax p'iqijawa) y "Toca tu…" (Umaykita llamiy / P'iqima llamkt'am).

// Ilustración de frente (290×577) y de espalda (286×574): x, y en píxeles de cada imagen
export const VISTAS = { frente: { w: 290, h: 577 }, espalda: { w: 286, h: 574 } };

export const PARTES = [
  // De frente
  { id: 'cabello', vista: 'frente', es: 'cabello', art: 'el', quechua: 'chukcha', aymara: "ñik'uta", x: 150, y: 34 },
  { id: 'ojo', vista: 'frente', es: 'ojo', art: 'el', quechua: 'ñawi', aymara: 'nayra', x: 116, y: 140 },
  { id: 'oreja', vista: 'frente', es: 'oreja', art: 'la', quechua: 'ninri', aymara: 'jinchu', x: 74, y: 148 },
  { id: 'nariz', vista: 'frente', es: 'nariz', art: 'la', quechua: 'sinqa', aymara: 'nasa', x: 142, y: 160 },
  { id: 'cara', vista: 'frente', es: 'cara', art: 'la', quechua: 'uya', aymara: 'ajanu', x: 192, y: 166 },
  { id: 'boca', vista: 'frente', es: 'boca', art: 'la', quechua: 'simi', aymara: 'laka', x: 145, y: 186 },
  { id: 'cuello', vista: 'frente', es: 'cuello', art: 'el', quechua: 'kunka', aymara: 'kunka', x: 145, y: 222 },
  { id: 'pecho', vista: 'frente', es: 'pecho', art: 'el', quechua: 'qhasqu', aymara: '', x: 116, y: 262, soloQuechua: true },
  { id: 'corazon', vista: 'frente', es: 'corazón', art: 'el', quechua: 'sunqu', aymara: 'lluqu', x: 172, y: 286 },
  { id: 'barriga', vista: 'frente', es: 'barriga', art: 'la', quechua: 'wiksa', aymara: 'puraka', x: 145, y: 306 },
  { id: 'ombligo', vista: 'frente', es: 'ombligo', art: 'el', quechua: 'pupu', aymara: 'kururu', x: 145, y: 343 },
  { id: 'mano', vista: 'frente', es: 'mano', art: 'la', quechua: 'maki', aymara: 'ampara', x: 32, y: 366 },
  { id: 'dedo', vista: 'frente', es: 'dedo', art: 'el', quechua: "ruk'ana", aymara: "luk'ana", x: 258, y: 382 },
  { id: 'rodilla', vista: 'frente', es: 'rodilla', art: 'la', quechua: 'muqu', aymara: 'qunquri', x: 108, y: 455 },
  { id: 'pie', vista: 'frente', es: 'pie', art: 'el', quechua: 'chaki', aymara: 'kayu', x: 183, y: 553 },
  // De espalda
  { id: 'cabeza', vista: 'espalda', es: 'cabeza', art: 'la', quechua: 'uma', aymara: "p'iqi", x: 150, y: 96 },
  { id: 'hombro', vista: 'espalda', es: 'hombro', art: 'el', quechua: 'rikra', aymara: 'kallachi', x: 88, y: 240 },
  { id: 'espalda', vista: 'espalda', es: 'espalda', art: 'la', quechua: 'wasa', aymara: 'jikhani', x: 150, y: 282 },
  { id: 'codo', vista: 'espalda', es: 'codo', art: 'el', quechua: '', aymara: 'mujlli', x: 50, y: 322, soloAymara: true },
];

// Partes de cada lengua (algunas se dicen solo con seguridad en una de ellas)
export const partesDe = (idioma) => PARTES.filter((p) => (idioma === 'aymara' ? !p.soloQuechua : !p.soloAymara));

const vocal = (w) => /[aeiouäïü]$/i.test(w);

// "Este es mi…" / "Toca tu…"
export const frasesParte = (p, idioma) => {
  const w = p[idioma];
  const mi = p.art === 'la' ? 'Esta es mi' : 'Este es mi';
  if (idioma === 'aymara') {
    const mia = w + (vocal(w) ? 'ja' : 'ija');
    const tuya = w + (vocal(w) ? 'ma' : 'ima');
    return {
      es: { original: `Akax ${mia}wa.`, traduccion: `${mi} ${p.es}.` },
      toca: { original: `${cap(tuya)} llamkt'am.`, traduccion: `Toca tu ${p.es}.` },
    };
  }
  const mia = w + (vocal(w) ? 'y' : 'niy');
  const tuya = w + (vocal(w) ? 'yki' : 'niyki');
  return {
    es: { original: `Kayqa ${mia}mi.`, traduccion: `${mi} ${p.es}.` },
    toca: { original: `${cap(tuya)}ta llamiy.`, traduccion: `Toca tu ${p.es}.` },
  };
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ==================== Números ====================
const Q_UNI = ['', 'huk', 'iskay', 'kimsa', 'tawa', 'pichqa', 'suqta', 'qanchis', 'pusaq', 'isqun'];
const A_UNI = ['', 'maya', 'paya', 'kimsa', 'pusi', 'phisqa', 'suxta', 'paqallqu', 'kimsaqallqu', 'llatunka'];

// Quechua: 13 = chunka kimsayuq, 17 = chunka qanchisniyuq, 20 = iskay chunka, 21 = iskay chunka hukniyuq
const quechua = (n) => {
  if (n === 1000) return 'waranqa';
  if (n === 100) return 'pachak';
  if (n < 10) return Q_UNI[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  const tens = d === 1 ? 'chunka' : `${Q_UNI[d]} chunka`;
  if (!u) return tens;
  const uni = Q_UNI[u];
  return `${tens} ${uni}${vocal(uni) ? 'yuq' : 'niyuq'}`;
};

// Aimara: 13 = tunka kimsani, 20 = pä tunka, 21 = pä tunka mayani
const aymara = (n) => {
  if (n === 1000) return 'waranqa';
  if (n === 100) return 'pataka';
  if (n < 10) return A_UNI[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  const tens = d === 1 ? 'tunka' : `${d === 2 ? 'pä' : A_UNI[d]} tunka`;
  if (!u) return tens;
  const uni = A_UNI[u];
  return `${tens} ${uni}${vocal(uni) ? 'ni' : 'ini'}`;
};

export const numeroEn = (n, idioma) => (idioma === 'aymara' ? aymara(n) : quechua(n));

// Partes del nombre del número, para pintarlas de colores en el constructor (decenas + unidades)
export const partesNumero = (n, idioma) => {
  const full = numeroEn(n, idioma);
  if (n < 11 || n === 100 || n === 1000 || n % 10 === 0) return [{ texto: full, tipo: n < 10 ? 'unidad' : 'decena' }];
  const tens = numeroEn(n - (n % 10), idioma);
  return [
    { texto: tens, tipo: 'decena' },
    { texto: full.slice(tens.length + 1), tipo: 'unidad' },
  ];
};

export const ES_NUM = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];

// ==================== El cuerpo en todo el programa ====================
// Reconoce si una palabra de una lección o del diccionario es una parte del dibujo 3D,
// por su significado en castellano o por la palabra en la lengua.
const plain = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’‘´`ʼ]/g, "'")
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.¡!¿?]/g, '')
    .trim();

const SINONIMOS = { pelo: 'cabello', oido: 'oreja', estomago: 'barriga', vientre: 'barriga', panza: 'barriga', rostro: 'cara', dedos: 'dedo', manos: 'mano', pies: 'pie', ojos: 'ojo', orejas: 'oreja', hombros: 'hombro', rodillas: 'rodilla' };

export const parteDePalabra = (palabra, significado, idioma) => {
  if (idioma !== 'quechua' && idioma !== 'aymara') return null;
  const partes = partesDe(idioma);
  const nativa = plain(palabra);
  const porPalabra = partes.find((p) => p[idioma] && plain(p[idioma]) === nativa);
  if (porPalabra) return porPalabra;
  const sentidos = plain(significado)
    .split(/[,/;]| o /)
    .map((s) => s.trim().replace(/^(el|la|los|las|mi|tu)\s+/, ''))
    .filter(Boolean);
  for (const s of sentidos) {
    const id = SINONIMOS[s] ?? s;
    const parte = partes.find((p) => plain(p.es) === id);
    if (parte) return parte;
  }
  return null;
};
