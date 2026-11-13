"""Vocabulario aymara de YachAru a partir del Intercontinental Dictionary Series (IDS).

Fuente: lista de aymara central (ayr, Glottocode cent2142) de Félix Layme Pairumani, en
Key, Mary Ritchie & Comrie, Bernard (eds.) 2023. The Intercontinental Dictionary Series.
Leipzig: Max Planck Institute for Evolutionary Anthropology. https://ids.clld.org — CC BY 4.0.
Traducciones al castellano: lista de conceptos Key-2016-1310 de Concepticon (CC BY 4.0).

Ningún dato sale de un modelo de lenguaje: cada palabra es una forma de IDS pasada de la
transcripción fonémica al alfabeto aymara oficial con las reglas de abajo, que están escritas y probadas.
Se omiten los préstamos del castellano (IDS los marca entre corchetes).

Uso: python generar_desde_ids.py <carpeta con forms.csv de github.com/lexibank/ids/tree/master/cldf> <Key-2016-1310.tsv>
Escribe vocabulario-ids.json en esta carpeta.
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

LANGUAGE_ID = "269"  # Aymara (central) en IDS
# Conceptos que no se enseñan en una plataforma escolar (siguen en IDS; solo no entran a YachAru)
EXCLUDE = {"4-464", "4-490", "4-492", "4-650", "4-660", "4-760", "19-720", "21-420", "21-430"}

# Transcripción fonémica de IDS → alfabeto aymara oficial (Perú y Bolivia).
# El orden importa: primero las secuencias largas.
RULES = [
    ("čʰ", "chh"), ("čˀ", "ch'"), ("č", "ch"),
    ("ḳʰ", "qh"), ("ḳˀ", "q'"), ("ḳ", "q"),
    ("kʰ", "kh"), ("kˀ", "k'"),
    ("pʰ", "ph"), ("pˀ", "p'"),
    ("tʰ", "th"), ("tˀ", "t'"),
    ("lʸ", "ll"), ("ɲ", "ñ"),
    ("χ", "x"),  # fricativa uvular
    ("x", "j"),  # fricativa velar (se escribe j); va después de χ → x
    ("aa", "ä"), ("ii", "ï"), ("uu", "ü"),  # vocal larga: diéresis
]


def to_practical(form):
    s = unicodedata.normalize("NFC", form.strip())
    # ḳ puede venir como k + punto combinante, y č como c + caron
    s = s.replace("ḳ", "ḳ").replace("č", "č")
    out = ""
    i = 0
    while i < len(s):
        for a, b in RULES:
            if s.startswith(a, i):
                out += b
                i += len(a)
                break
        else:
            out += s[i]
            i += 1
    # Guiones de IDS: sufijo corto pegado (ch'uqi-ña → ch'uqiña); compuesto separado (mama-quta → mama quta)
    parts = out.split("-")
    word = parts[0]
    for p in parts[1:]:
        word += p if len(p) <= 3 else " " + p
    return word


def clean_spanish(text):
    s = re.sub(r"\(cf\.?[^)]*\)", "", text)
    s = re.sub(r"\s+", " ", s).strip(" ,;")
    return s


def main():
    forms_dir, concepts_file = Path(sys.argv[1]), Path(sys.argv[2])
    spanish, english = {}, {}
    with open(concepts_file, encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            spanish[row["IDS_ID"]] = clean_spanish(row["SPANISH"])
            english[row["IDS_ID"]] = row["ENGLISH"]
    entries, seen_forms, seen_concepts = [], set(), set()
    with open(forms_dir / "forms.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["Language_ID"] != LANGUAGE_ID:
                continue
            concept = row["Parameter_ID"]
            if concept in seen_concepts or concept in EXCLUDE or "[" in row["Value"] or not spanish.get(concept):
                continue  # una forma por concepto; sin préstamos ni conceptos sin traducción
            word = to_practical(row["Form"])
            if not word or word in seen_forms or len(word.split()) > 3:
                continue
            seen_concepts.add(concept)
            seen_forms.add(word)
            entries.append({
                "ids": concept,
                "capitulo": int(concept.split("-")[0]),
                "aymara": word,
                "ids_forma": row["Form"],
                "espanol": spanish[concept],
                "ingles": english.get(concept, ""),
                "nota": row["Comment"] or None,
            })
    out = Path(__file__).with_name("vocabulario-ids.json")
    out.write_text(json.dumps({
        "fuente": "Félix Layme Pairumani, Aymara (central), en Key & Comrie (eds.) 2023, The Intercontinental Dictionary Series, https://ids.clld.org (CC BY 4.0)",
        "traducciones": "Concepticon, lista Key-2016-1310 (CC BY 4.0)",
        "entradas": entries,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(entries)} entradas -> {out.name}")


if __name__ == "__main__":
    main()
