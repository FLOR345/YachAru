// Paquetes de idioma: cada archivo .json de esta carpeta es una lengua.
// Agregar una lengua nueva = agregar su archivo (ver plantilla en docs/paquete-de-idioma.md)
// y cargar su contenido con backend/scripts/import-language.js. Nada más del código cambia.
const modules = import.meta.glob('./*.json', { eager: true });

// Colores disponibles por nombre (clases escritas completas para que Tailwind las incluya)
export const COLOR_STYLES = {
  verde: {
    solid: 'bg-green-700',
    hover: 'hover:bg-green-800',
    text: 'text-green-800',
    soft: 'bg-green-50',
    ring: 'ring-green-700',
    border: 'border-green-700',
    header: 'bg-green-800',
    headerSoft: 'text-green-100',
    gradient: 'from-emerald-500 to-green-700',
    hex: '#15803d',
  },
  azul: {
    solid: 'bg-blue-800',
    hover: 'hover:bg-blue-900',
    text: 'text-blue-900',
    soft: 'bg-blue-50',
    ring: 'ring-blue-800',
    border: 'border-blue-800',
    header: 'bg-blue-900',
    headerSoft: 'text-blue-100',
    gradient: 'from-sky-500 to-blue-700',
    hex: '#1e40af',
  },
  terracota: {
    solid: 'bg-orange-700',
    hover: 'hover:bg-orange-800',
    text: 'text-orange-800',
    soft: 'bg-orange-50',
    ring: 'ring-orange-700',
    border: 'border-orange-700',
    header: 'bg-orange-800',
    headerSoft: 'text-orange-100',
    gradient: 'from-orange-600 to-orange-800',
    hex: '#c2410c',
  },
  morado: {
    solid: 'bg-purple-700',
    hover: 'hover:bg-purple-800',
    text: 'text-purple-800',
    soft: 'bg-purple-50',
    ring: 'ring-purple-700',
    border: 'border-purple-700',
    header: 'bg-purple-800',
    headerSoft: 'text-purple-100',
    gradient: 'from-purple-600 to-purple-800',
    hex: '#7e22ce',
  },
};

// Orden estable: quechua y aymara primero, luego el resto alfabéticamente
const PRIORITY = ['quechua', 'aymara'];
export const LANGUAGES = Object.values(modules)
  .map((m) => m.default ?? m)
  .filter((pack) => pack && pack.id && !pack.oculto)
  .sort((a, b) => {
    const ia = PRIORITY.indexOf(a.id);
    const ib = PRIORITY.indexOf(b.id);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.nombre.localeCompare(b.nombre, 'es');
  });

export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id);

export const getLanguage = (id) => LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];

export const languageStyle = (id) => COLOR_STYLES[getLanguage(id)?.color] ?? COLOR_STYLES.verde;
