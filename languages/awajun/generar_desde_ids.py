"""
Construye el paquete de demostración de awajún desde la Intercontinental Dictionary Series (CC BY 4.0).
Ningún dato sale de un modelo de lenguaje: cada palabra es una forma de IDS, pasada a la escritura práctica
con las reglas de GRAFIA. Los ejercicios se derivan mecánicamente del propio vocabulario.

Uso: python generar_desde_ids.py <carpeta con forms.csv y languages.csv de github.com/lexibank/ids/tree/master/cldf>
"""
import csv
import json
import random
import sys
import unicodedata
from pathlib import Path

# Transcripción fonémica de IDS → escritura práctica. Solo se eligieron palabras sin b, d, g ambiguas.
GRAFIA = [("h", "j"), ("c̷", "ts"), ("š", "sh"), ("č", "ch"), ("ɨ", "e"), ("'", ""), ("-", "")]

# id de la forma en IDS → (traducción, grupo). Las traducciones vienen del concepto de IDS.
FORMAS = {
    "258-1-310-1": ("agua", "Naturaleza"),
    "258-1-420-1": ("árbol", "Naturaleza"),
    "258-1-520-1": ("sol", "Naturaleza"),
    "258-1-530-1": ("luna", "Naturaleza"),
    "258-1-540-1": ("estrella", "Naturaleza"),
    "258-3-581-1": ("pájaro", "Naturaleza"),
    "258-3-610-1": ("perro", "Naturaleza"),
    "258-3-650-1": ("pez", "Naturaleza"),
    "258-4-210-1": ("ojo", "El cuerpo"),
    "258-4-220-1": ("oreja", "El cuerpo"),
    "258-4-230-1": ("nariz", "El cuerpo"),
    "258-4-240-1": ("boca", "El cuerpo"),
    "258-4-330-1": ("mano", "El cuerpo"),
    "258-2-220-1": ("mujer", "El cuerpo"),
    "258-13-10-1": ("uno", "Números"),
    "258-13-30-1": ("tres", "Números"),
    "258-13-40-1": ("cuatro", "Números"),
}


def grafia(form):
    form = unicodedata.normalize("NFC", form)
    for source, target in GRAFIA:
        form = form.replace(source, target)
    return form


def ejercicios(palabras, rng):
    result = []
    for i, (target, spanish) in enumerate(palabras):
        wrong = rng.sample([p[0] for p in palabras if p[0] != target], 2)
        if i % 3 == 0:
            options = rng.sample([target, *wrong], 3)
            result.append({"tipo": "multiple_choice", "pregunta": f"¿Cómo se dice «{spanish}»?", "opciones": options, "respuesta_correcta": target})
        elif i % 3 == 1:
            result.append({"tipo": "translate", "pregunta": f"Escribe «{spanish}» en awajún", "respuesta_correcta": target})
        else:
            result.append({"tipo": "listen_write", "pregunta": "Escucha y escribe", "respuesta_correcta": target})
    return result


def main():
    source = Path(sys.argv[1])
    forms = {row["ID"]: row for row in csv.DictReader((source / "forms.csv").open(encoding="utf-8"))}
    rng = random.Random(2026)
    groups = {}
    for form_id, (spanish, group) in FORMAS.items():
        groups.setdefault(group, []).append((grafia(forms[form_id]["Form"]), spanish, form_id))

    unidades = [{
        "nombre": "Primeras palabras",
        "descripcion": "Unidad de demostración: vocabulario básico del awajún.",
        "lecciones": [
            {
                "titulo": group,
                "contenido_teorico": "Palabras tomadas de la Intercontinental Dictionary Series.",
                "vocabulario": [{"palabra_objetivo": t, "palabra_espanol": s, "categoria": group.lower()} for t, s, _ in items],
                "ejercicios": ejercicios([(t, s) for t, s, _ in items], rng),
            }
            for group, items in groups.items()
        ],
    }]

    path = Path(__file__).parent / "paquete.json"
    pack = json.loads(path.read_text(encoding="utf-8"))
    pack["contenido"] = {
        "fuente": {
            "referencia": "Wipio Deicat, Gerardo. 2023. Aguaruna dictionary. En: Key, Mary Ritchie & Comrie, Bernard (eds.), The Intercontinental Dictionary Series. Leipzig: Max Planck Institute for Evolutionary Anthropology. https://ids.clld.org/contributions/258",
            "licencia": "CC BY 4.0",
            "formas_ids": {t: i for items in groups.values() for t, _, i in items},
            "revisado_por": "Pendiente: ningún hablante de awajún lo ha revisado. Es una demostración técnica de extensibilidad y no se publica en la plataforma.",
        },
        "unidades": unidades,
    }
    path.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Palabras:", ", ".join(t for items in groups.values() for t, _, _ in items))


if __name__ == "__main__":
    main()
