// Cuentos de YachAru: portadas de cada cuento y cuentos que se suman a los del servidor.
// - PORTADAS: una foto real con licencia abierta (Wikimedia Commons) que tiene que ver con el cuento,
//   reducida a WebP en assets/cuentos/<clave>.webp, con su crédito en cuentosCreditos.json.
// - CUENTOS_EXTRA: versiones breves de relatos de tradición oral andina escritas para YachAru, con su
//   traducción párrafo por párrafo. Conviene que una hablante nativa las revise antes de ampliarlas.
import CREDITOS from './cuentosCreditos.json';
import { EXTRAS_REVISADOS } from './culturaExtra';

const IMAGENES = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/cuentos/*.webp', { eager: true, import: 'default' })).map(([path, url]) => [path.split('/').pop().replace('.webp', ''), url])
);

// Título del cuento (sin tildes ni mayúsculas) → clave de la imagen y descripción de la foto
const PORTADAS = {
  'el zorro y el condor': ['zorro-condor', 'Un cóndor andino vuela sobre el cañón del Colca'],
  'el origen de la quinua': ['quinua', 'Campo de quinua roja en el altiplano'],
  'los hermanos ayar': ['ayar', 'Llamas y pastoras frente a los muros de Sacsayhuamán, en el Cusco'],
  'el zorro y la perdiz': ['zorro-perdiz', 'Una perdiz andina camina entre la hierba'],
  'la laguna encantada': ['laguna-encantada', 'Amanecer sobre el lago Titicaca, en Puno'],
  'el origen del ekeko': ['ekeko', 'Figura del Ekeko cargado de miniaturas'],
  'kunturwan michiqmasi': ['kunturwan', 'Una llama entre muros de piedra en los Andes'],
  'sarapa paqariyninmanta': ['sara', 'Mazorcas de maíz andino de muchos colores'],
  'enchantasqa qucha': ['qucha', 'Laguna turquesa al pie de un nevado'],
  'ukuku orqopa': ['ukuku', 'Un oso de anteojos, el oso de los Andes'],
  'qamaqi ukat phaxsi': ['phaxsi', 'La luna llena sobre las montañas de los Andes'],
  'imilla ukat kurmi': ['kurmi', 'La montaña de colores, como un arcoíris de tierra'],
  'thayan qalltawi': ['thaya', 'Camino en el altiplano de Bolivia, bajo un cielo ventoso'],
  'challwiri ukat qutan sirina': ['challwiri', 'Una balsa de totora en el lago Titicaca'],
  "wayna waranakan arust'iri": ['warana', 'La Vía Láctea sobre un cerro de los Andes'],
  'qullu jaytiri': ['qullu', 'El nevado Huayna Potosí al atardecer'],
  'yuqalla ukat kunturi usuntata': ['kunturi', 'Un cóndor andino vuela sobre un glaciar'],
  'sawuna warmi ukat kurmi': ['sawuna', 'Una tejedora de Chinchero teje en su telar de cintura'],
  "rit'i qullunakan arktawi": ['riti', 'El nevado Sajama visto desde el altiplano'],
  'pacha maman anatan': ['anata', 'Danzantes en la fiesta del Anata Andino, en Oruro'],
};

const clave = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const conPortada = (img, alt) => {
  const c = CREDITOS[img];
  if (!IMAGENES[img]) return {};
  return {
    portada: IMAGENES[img],
    portadaAlt: alt,
    creditoPortada: c ? { autor: c.autor || 'Autor desconocido', licencia: c.licencia, pagina: c.pagina } : null,
  };
};

// Cuentos que se suman a los que vienen del servidor
const CUENTOS_EXTRA = [
  {
    id: 'simiaru-manku-qhapaq',
    idioma: 'quechua',
    titulo: 'Manku Qhapaqwan Mama Uqllowan',
    region: 'Puno y Cusco',
    nivel: 'intermedio',
    img: ['manco', 'La Isla del Sol en el lago Titicaca'],
    contenido_original: `Ñawpa pachakunapi runakunaqa sallqa hina kawsaqku: mana wasiyuq, mana chakrayuq, mana p'achayuq.
Inti Taytaqa chayta rikuspa llakikurqan. Chaymi iskay wawankunata Titiqaqa qochamanta lluqsichimurqan: Manku Qhapaqta, Mama Uqllotawan.
Inti Taytaqa paykunaman qori tawnata qurqan: "Maypichus kay tawna allpaman chinkaykunqa, chaypi hatun llaqtata ruwankichik" nispa.
Unayta purirqanku. Wanakawri urqu patapi qori tawnaqa allpaman chinkaykurqan. Chaypim Qusqu llaqtata hatarichirqanku.
Manku Qhapaqqa qharikunaman chakra llamk'ayta yachachirqan; Mama Uqllotaq warmikunaman puskayta, awayta ima. Chaymantapachan Inkakunaqa Intipa churinkuna sutichasqa karqanku.`,
    traduccion: `En tiempos antiguos las personas vivían como salvajes: sin casa, sin chacra y sin ropa.
El Padre Sol, al ver eso, se entristeció. Por eso hizo salir del lago Titicaca a dos de sus hijos: Manco Cápac y Mama Ocllo.
El Padre Sol les dio un bastón de oro y les dijo: "Donde este bastón se hunda en la tierra, allí fundarán una gran ciudad".
Caminaron mucho tiempo. Sobre el cerro Huanacaure, el bastón de oro se hundió en la tierra. Allí fundaron la ciudad del Cusco.
Manco Cápac enseñó a los hombres a trabajar la chacra, y Mama Ocllo enseñó a las mujeres a hilar y a tejer. Desde entonces a los incas se les llamó hijos del Sol.`,
    explicacion:
      'Leyenda del origen de los incas que recogió el Inca Garcilaso de la Vega. Une el lago Titicaca, lugar sagrado de Puno, con la fundación del Cusco, y presenta el trabajo de la chacra y el tejido como regalos para vivir en comunidad.',
  },
  {
    id: 'simiaru-quwiwan-atuqwan',
    idioma: 'quechua',
    titulo: 'Quwiwan Atuqwan',
    region: 'Andes del sur',
    nivel: 'basico',
    img: ['quwi', 'Un cuy dorado entre la paja'],
    contenido_original: `Huk kutis huk quwi sapa tuta huk machulapa chakranman yaykuspa alfata mikhuq kasqa.
Machulaqa piñakuspa huk t'ipina llikata churarqan. Chay tutapi quwiqa llikapi hapichikurqan.
Tutamanta atuq hamuspa tapurqan: "¿Imanaqtinmi chaypi watasqa kachkanki?" Quwiqa nirqan: "Machulaqa ususinwan casarachiwanqa, ichaqa ñuqa manam munanichu".
Atuqqa kusikuspa nirqan: "¡Ñuqa casarakusaq!" Quwita kacharirqan, paytaq rantinpi watakurqan. Quwiqa phawaylla ayqikurqan.
Machula hamuspa atuqta rikurqan, k'aspiwan qatikacharqan. Chaymantapachan atuqqa quwita maskaspa purin, ichaqa quwiqa uchuy t'uqukunapi pakakun.`,
    traduccion: `Una vez, un cuy entraba cada noche a la chacra de un anciano y se comía la alfalfa.
El anciano, enojado, puso una trampa. Esa noche el cuy quedó atrapado en ella.
Al amanecer llegó el zorro y le preguntó: "¿Por qué estás atado ahí?". El cuy le dijo: "El anciano me quiere casar con su hija, pero yo no quiero".
El zorro, contento, dijo: "¡Yo me casaré!". Soltó al cuy y se ató en su lugar. El cuy se escapó corriendo.
El anciano llegó, vio al zorro y lo persiguió con un palo. Desde entonces el zorro anda buscando al cuy, pero el cuy se esconde en agujeros pequeñitos.`,
    explicacion:
      'Cuento de tradición oral muy contado en los Andes: el pequeño vence al grande con ingenio, y la ambición del zorro lo mete en problemas.',
  },
  {
    id: 'simiaru-hampatupa-takin',
    idioma: 'quechua',
    titulo: "Hamp'atupa Takin",
    region: 'Puno',
    nivel: 'basico',
    img: ['hampatu', 'Un pequeño sapo andino en la palma de una mano'],
    contenido_original: `Huk wataqa manam para chayamurqanchu. Chakrakuna ch'akirqan, uywakunapas yakunayawan kachkarqanku.
Runakunaqa Apukunaman mañakurqanku, ichaqa paraqa manam hamurqanchu. Huk paya nirqan: "Hamp'atuta tapusun, payqa yakuq masinmi".
Warmachakuna qocha patapi huk uchuy hamp'atuta tarirqanku. Hamp'atuqa nirqan: "Ñuqa takisaq, qamkunataq yanapawankichik".
Chay tutapi hamp'atuwan warmachakunawan kuska takirqanku: "¡Wak'ak, wak'ak, para hamuy!". Phuyukunaqa urqukunapi huñukurqanku.
Paqarinintin sumaq para chayamurqan. Chaymantapachan runakunaqa hamp'atuta manam wañuchinkuchu: payqa parata waqyaqmi.`,
    traduccion: `Un año la lluvia no llegó. Las chacras se secaron y los animales tenían sed.
La gente pidió a los Apus, pero la lluvia no venía. Una anciana dijo: "Preguntemos al sapo, él es amigo del agua".
Los niños encontraron un sapito a la orilla de la laguna. El sapo les dijo: "Yo cantaré, y ustedes me ayudarán".
Esa noche el sapo y los niños cantaron juntos: "¡Wak'ak, wak'ak, ven, lluvia!". Las nubes se juntaron sobre los cerros.
Al día siguiente llegó una buena lluvia. Desde entonces la gente no mata a los sapos: ellos llaman a la lluvia.`,
    explicacion:
      'En muchas comunidades andinas se dice que el canto de los sapos anuncia y llama a la lluvia, y por eso se los respeta. El cuento enseña a cuidar a los pequeños animales que ayudan a la chacra.',
  },
  {
    id: 'simiaru-kukapa-paqariynin',
    idioma: 'quechua',
    titulo: 'Kukapa Paqariynin',
    region: 'Cusco',
    nivel: 'intermedio',
    img: ['kuka', 'Hojas verdes de la planta de coca'],
    contenido_original: `Ñawpa pachapi Mama Kuka sutiyuq sumaq warmi kawsarqan. Payqa llamk'aq runakunata anchata khuyaq.
Runakunaqa urqukunapi sinchita llamk'aqku, chirimanta, yarqaymanta, sayk'uymanta ñak'arispa.
Huk p'unchaw Mama Kuka nirqan: "Ñuqa huk sach'a tukusaq. Raphiykunata akulliychik, kallpatam qusqaykichik".
Chaymantapacha kuka sach'a yunkakunapi wiñarqan. Runakunaqa raphinkunata akullispa sayk'uyta qunqanku, Pachamamamanpas haywanku.
Kunankamapas kuka k'intuta masinkunawan rakinakunku, ayni ruwaspa. Kukaqa runakunata huñunmi.`,
    traduccion: `En tiempos antiguos vivía una hermosa mujer llamada Mama Coca. Ella quería mucho a la gente que trabajaba.
La gente trabajaba duro en los cerros, sufriendo de frío, de hambre y de cansancio.
Un día Mama Coca dijo: "Me convertiré en una planta. Mastiquen mis hojas y les daré fuerza".
Desde entonces la planta de coca crece en los valles cálidos. La gente, al chacchar sus hojas, olvida el cansancio, y también las ofrece a la Pachamama.
Hasta hoy comparten un k'intu de coca con sus compañeros, haciendo ayni. La coca une a las personas.`,
    explicacion:
      "La hoja de coca es sagrada en los Andes: se comparte en el k'intu (tres hojas escogidas), se ofrece a la Pachamama y acompaña el trabajo comunitario. El cuento explica su origen como un regalo de cariño.",
  },
  {
    id: 'simiaru-qintipa-yakun',
    idioma: 'quechua',
    titulo: "Q'intipa Yakun",
    region: 'Andes',
    nivel: 'basico',
    img: ['qenti', 'Un picaflor andino posado sobre una flor'],
    contenido_original: `Huk p'unchaw hatun nina sach'a-sach'apim rawrayta qallarirqan. Llapan uywakuna mancharisqa ayqirqanku.
Ichaqa uchuy q'intiqa mayuman phawarqan. Chupinpi huk sut'uy yakuta apamuspa ninaman hich'arqan. Kutin-kutin phawarqan.
Ukukuqa asikuspa tapurqan: "¿Imatataq ruwachkanki? Chay sut'uywanqa manam ninata wañuchinkichu".
Q'intiqa kutichirqan: "Yachanim. Ichaqa ñuqaqa ruwanayta ruwachkani".
Chayta uyarispa ukukupas, atuqpas, kunturpas yanaparqanku. Llapanku kuska llamk'aspa ninata wañuchirqanku.`,
    traduccion: `Un día un gran fuego empezó a arder en el bosque. Todos los animales huyeron asustados.
Pero el pequeño picaflor voló hasta el río. Trajo una gota de agua en su pico y la echó al fuego. Volaba una y otra vez.
El oso, riéndose, le preguntó: "¿Qué estás haciendo? Con esa gota no vas a apagar el fuego".
El picaflor respondió: "Ya lo sé. Pero yo estoy haciendo lo que me toca".
Al escuchar eso, el oso, el zorro y el cóndor también ayudaron. Trabajando todos juntos, apagaron el fuego.`,
    explicacion:
      'Fábula andina sobre la responsabilidad: cada uno aporta lo suyo, por pequeño que sea, y el trabajo de todos juntos —como en el ayni y la minka— logra lo que nadie logra solo.',
  },
  {
    id: 'simiaru-illimani-mururata',
    idioma: 'aymara',
    titulo: 'Illimani ukat Mururata',
    region: 'La Paz',
    nivel: 'intermedio',
    img: ['illimani', 'El nevado Illimani sobre la ciudad de La Paz'],
    contenido_original: `Nayra pachanxa Illimani ukat Mururata pä jach'a qullunakawa utjäna.
Mururatax wali jach'a jach'a tukuriwa, ukat sapxänwa: "Nayax Illimanit sipan jach'äxtwa".
Willka Tatax uk ist'asax wali colerasïna. Mä qalampiw Mururatar q'urawampi jaquntäna, p'iqipax jaya jayaruw t'ijtäna.
Uka p'iqix Oruro uraqiruw purïna, ukat Sajama qullu tukuwayxäna.
Jichhürkamax Mururatax jan p'iqini uñjasi. Illimanisti La Paz markaruw uñch'ukiski, jach'a achachila ukhama.`,
    traduccion: `En tiempos antiguos, el Illimani y el Mururata eran dos grandes cerros.
El Mururata era muy orgulloso y decía: "Yo soy más grande que el Illimani".
El Padre Sagrado, al escucharlo, se enojó mucho. Con una piedra lanzada con su honda golpeó al Mururata, y su cabeza voló muy, muy lejos.
Esa cabeza cayó en tierras de Oruro y se convirtió en el nevado Sajama.
Hasta hoy el Mururata se ve sin cabeza, y el Illimani sigue cuidando la ciudad de La Paz, como un gran abuelo protector.`,
    explicacion:
      'Leyenda paceña que explica por qué el cerro Mururata tiene la cima plana y por qué el Illimani es el achachila (abuelo protector) de La Paz. Enseña que el orgullo trae su castigo.',
  },
  {
    id: 'simiaru-juphan-qalltawipa',
    idioma: 'aymara',
    titulo: 'Juphan Qalltawipa',
    region: 'Altiplano',
    nivel: 'basico',
    img: ['jupha', 'Plantas de quinua roja a punto de cosecha'],
    contenido_original: `Nayra pachanxa jaqinakax janiw jupha uñt'apkänti. Juk'a manq'akiw utjäna.
Mä arumax mä warawara imillaw alaxpachat saraqanïna. Jupax mä awatiri waynaruw munasïna.
Imillax alaxpachar kutt'añ amtasax waynaru mä jisk'a wayaqa churäna: "Akax alaxpachan manq'apawa, yapuchim" sasa.
Waynax uka jisk'a jathanak yapuchäna. Wila, q'illu, janq'u juphanakaw suma jilïna.
Ukat uksaruw aymara jaqinakax juphampi jakasipxi, warawaranakar yuspagarasa.`,
    traduccion: `En tiempos antiguos la gente no conocía la quinua. Había poca comida.
Una noche, una muchacha estrella bajó del cielo. Ella se enamoró de un joven pastor.
Cuando decidió volver al cielo, le dio al joven una bolsita y le dijo: "Esto es comida del cielo, siémbralo".
El joven sembró esas semillas pequeñitas. Crecieron muy bien quinuas rojas, amarillas y blancas.
Desde entonces el pueblo aimara vive con la quinua, agradeciendo a las estrellas.`,
    explicacion:
      'Versión breve de una leyenda aimara que cuenta que la quinua (jupha) llegó del cielo. Muestra la quinua como alimento sagrado del altiplano, con sus muchos colores.',
  },
  {
    id: 'simiaru-qamaqi-ukat-wari',
    idioma: 'aymara',
    titulo: 'Qamaqi ukat Wari',
    region: 'Puno',
    nivel: 'basico',
    img: ['wari', 'Vicuñas en la pampa de la laguna de Salinas'],
    contenido_original: `Mä jach'a pampanxa mä wari tamapampi jakasïna. Warix wali suma t'awrani, wali jank'akiw t'ijiri.
Mä qamaqix warir jisk'achasïna: "Jumax ch'uwa umakiw umta, wali jach'a jach'a tukutawa" sasa.
Mä maranxa jallux janiw purinkänti. Qutanakas jawiranakas wañt'awayxäna. Qamaqix umat pharsuskäna.
Warix qamaqir uñjasax sänwa: "Jutam, nayax mä jisk'a jalsu yatta". Qullu manqhanxa ch'uwa umaw jalsuskäna.
Qamaqix umasax p'inqasïna: "Pampachita, wari, suma chuymaniwa jumax". Ukat uksaruw janiw jisk'achxänti.`,
    traduccion: `En una gran pampa vivía una vicuña con su manada. La vicuña tenía una lana muy fina y corría muy rápido.
Un zorro se burlaba de la vicuña: "Tú solo tomas agua limpia, eres muy creída", le decía.
Un año la lluvia no llegó. Las lagunas y los ríos se secaron. El zorro se moría de sed.
La vicuña, al ver al zorro, le dijo: "Ven, yo conozco un pequeño manantial". Dentro del cerro brotaba agua limpia.
El zorro bebió y sintió vergüenza: "Perdóname, vicuña, tú tienes buen corazón". Desde entonces ya no se burló de ella.`,
    explicacion:
      'Cuento sobre el respeto y la solidaridad: la vicuña, animal protegido del altiplano, comparte el agua aun con quien se burló de ella. En los Andes el agua es de todos.',
  },
  {
    id: 'simiaru-titiqaqa-qalltawipa',
    idioma: 'aymara',
    titulo: 'Titiqaqa Qutan Qalltawipa',
    region: 'Puno',
    nivel: 'intermedio',
    img: ['titiqaqa', 'Islas y balsas de totora en el lago Titicaca'],
    contenido_original: `Nayra pachanxa, jichha qutax utjki uka chiqanxa mä suma pampaw utjäna. Jaqinakax kusisitaw jakasipxäna.
Apunakax sapxänwa: "Janiw nina qulluru makhatapxañamäkiti". Ukampis jaqinakax jan ist'asaw makhatapxäna.
Ukatwa qullunakat titinakax mistunipxäna, jaqinakar manq'antañ munasa. Inti Tatax uk uñjasax pusi tunka uruw jachäna.
Jachapax pampa phuqhantäna, ukat jach'a qutaruw tukuwayi. Titinakax qalaruw tukupxäna. Mä chacha, mä warmimpikiw mä yampun qhispipxäna.
Ukatwa uka qutax "Titiqaqa" satawa, "qalat tukut titi" sañ muni.`,
    traduccion: `En tiempos antiguos, donde ahora está el lago, había una hermosa pampa. La gente vivía feliz.
Los Apus les dijeron: "No deben subir al cerro del fuego". Pero la gente no escuchó y subió.
Por eso de los cerros salieron pumas que querían devorar a la gente. El Padre Sol, al verlo, lloró cuarenta días.
Sus lágrimas llenaron la pampa y se convirtieron en un gran lago. Los pumas se volvieron de piedra. Solo un hombre y una mujer se salvaron en una balsa de totora.
Por eso ese lago se llama "Titicaca", que quiere decir "puma convertido en piedra".`,
    explicacion:
      'Leyenda que explica el nombre del lago Titicaca (titi: puma; qaqa: roca gris). Enseña a respetar los consejos de los mayores y de los Apus.',
  },
  {
    id: 'simiaru-jukumari-ukat-imilla',
    idioma: 'aymara',
    titulo: 'Jukumari ukat Imilla',
    region: 'Altiplano',
    nivel: 'intermedio',
    img: ['jukumari', 'Un oso de anteojos sentado entre las plantas'],
    contenido_original: `Mä imillaw qullunakan uywanakap awatïna. Sapa uruw wali sumat q'uchuri.
Mä jukumarix q'uchupa ist'asax munasïna. Mä urux imillar katusaw qhawaparu apasxäna.
Imillax qhawan jachaskakïna, utaparu kutt'añ munäna. Jukumarix sapa uru muxsa achunak apanïna, ukampis imillax janiw kusisïkänti.
Mä urux jukumarix sänwa: "Munasiñax janiw katuyasiñakiti. Sarxam, utamaru kutt'am". Ukat imillar qullut mistuñkam irpäna.
Imillax ayllupar kutt'asax jukumarit yatiyäna. Ukat uksaruw jaqinakax jukumarir jan jiwayapxi, qullunakan suma jakasiñapataki.`,
    traduccion: `Una muchacha pastaba sus animales en los cerros. Cada día cantaba muy bonito.
Un oso, al escuchar su canto, se enamoró. Un día tomó a la muchacha y se la llevó a su cueva.
La muchacha lloraba en la cueva; quería volver a su casa. El oso cada día le traía frutas dulces, pero la muchacha no estaba feliz.
Un día el oso le dijo: "El cariño no se atrapa. Vete, vuelve a tu casa". Y la acompañó hasta la salida del cerro.
La muchacha volvió a su ayllu y contó lo del oso. Desde entonces la gente no mata al oso, para que viva tranquilo en los cerros.`,
    explicacion:
      'Versión para niños del cuento del jukumari (oso andino), muy conocido en el altiplano. Enseña que el cariño no se impone y que hay que cuidar al oso de anteojos, un animal en peligro.',
  },
].map(({ img, ...c }) => ({ ...c, tipo: 'cuento', fuente: 'YachAru · versión de la tradición oral', ...conPortada(img[0], img[1]) }));

// Une los cuentos del servidor con los de YachAru (sin repetir títulos) y les pone su portada
export const conCuentosExtra = (cuentos, idioma) => {
  const vistos = new Set(cuentos.map((c) => clave(c.titulo)));
  const extra = EXTRAS_REVISADOS[idioma] ? CUENTOS_EXTRA.filter((c) => c.idioma === idioma && !vistos.has(clave(c.titulo))) : [];
  return [...cuentos, ...extra].map((c) => {
    if (c.portada) return c;
    const p = PORTADAS[clave(c.titulo)];
    return p ? { ...c, ...conPortada(p[0], p[1]) } : c;
  });
};

// Minutos de lectura aproximados (unas 120 palabras por minuto en una lengua que se está aprendiendo)
export const minutosDeLectura = (c) => Math.max(1, Math.round(String(c.contenido_original ?? '').split(/\s+/).length / 120));

export default CUENTOS_EXTRA;
