# Vocabulario aymara (IDS)

El vocabulario aymara de SimiAru viene de la lista de **aymara central** (`ayr`, Glottocode `cent2142`) de **Félix Layme Pairumani** en el *Intercontinental Dictionary Series*:

> Key, Mary Ritchie & Comrie, Bernard (eds.) 2023. *The Intercontinental Dictionary Series*. Leipzig: Max Planck Institute for Evolutionary Anthropology. https://ids.clld.org — licencia **CC BY 4.0**.

Las traducciones al castellano son las de la lista de conceptos `Key-2016-1310` de Concepticon (CC BY 4.0).

## Cómo se genera

```bash
python generar_desde_ids.py <carpeta con forms.csv de lexibank/ids/cldf> <Key-2016-1310.tsv>
python -m unittest test_generar.py
```

`generar_desde_ids.py` pasa cada forma de la transcripción fonémica de IDS al alfabeto aymara oficial con reglas fijas, y escribe `vocabulario-ids.json`:

| IDS | Alfabeto | IDS | Alfabeto |
|---|---|---|---|
| č, čʰ, čˀ | ch, chh, ch' | lʸ | ll |
| ḳ, ḳʰ, ḳˀ | q, qh, q' | ɲ | ñ |
| kʰ, kˀ | kh, k' | x | j |
| pʰ, pˀ | ph, p' | χ | x |
| tʰ, tˀ | th, t' | aa, ii, uu | ä, ï, ü |

Los guiones de IDS se unen si lo que sigue es un sufijo corto (`quta-ña` → *qutaña*) y se separan en los compuestos (`wara-wara` → *wara wara*). Ninguna palabra sale de un modelo de lenguaje.

Se dejan fuera los préstamos del castellano (IDS los marca entre corchetes) y 9 conceptos que no se enseñan en una plataforma escolar (lista `EXCLUDE`).

`backend/scripts/aymara-desde-ids.js` carga el vocabulario en la base. Arma una unidad por capítulo de IDS, lecciones de 9 a 12 palabras y ejercicios generados con esas mismas palabras.

## Para revisar con un hablante

- **j y x.** IDS escribe con `x` algunas palabras que en la escritura usual llevan la uvular *x*. Por ejemplo, la luna sale como *phajsi*, y suele escribirse *phaxsi*. Un hablante debe confirmarlas una por una en `/validacion`.
- **Variedad.** La lista de Layme Pairumani es aymara central (La Paz y Puno). Las diferencias con el aymara de Puno se marcan como **variante**.

## Por qué no el diccionario anterior

El vocabulario anterior, de 996 entradas, venía entero de un diccionario del Ministerio de Educación de Chile. No hay licencia confirmada para redistribuirlo, y es de otra variedad. Se retiró completo.
