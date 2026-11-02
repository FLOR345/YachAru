"""
Generación de audio de SimiAru con modelos MMS de Meta (síntesis de voz neuronal entrenada en la lengua).

  quechua → facebook/mms-tts-quz  (Cusco-Collao, el mismo grupo dialectal que Puno)
  aymara  → facebook/mms-tts-ayr  (aymara central)
  otra    → el modelo que declare su paquete de idioma (voz.modelo)

El proceso corre en línea (.github/workflows/audio-mms.yml), contra la base de Neon y Cloudinary.
El audio se pregenera UNA sola vez por texto: costo recurrente cero, sin espera para quien aprende,
y disponible sin conexión cuando la PWA lo guarda. Licencia del audio: CC-BY-NC-4.0 (la de los modelos).

LAS VOCES GRABADAS NO SE TOCAN. Se registran primero en la tabla audios como 'grabado', y el proceso
solo genera textos sin audio y solo escribe en filas de vocabulario con audio_url vacía.

Modos:
  Lote de prueba: genera N palabras al azar en una carpeta para escucharlas. No escribe en la base.
        python generate_audio.py --idioma quechua --muestra 30
  Generación completa: sube a Cloudinary, llena la tabla audios y vocabulario.audio_url. Exige --confirmar.
        python generate_audio.py --idioma quechua --todo --subir --confirmar

Se puede interrumpir y repetir: cada audio queda guardado al terminarlo y no se vuelve a generar.
Siempre escribe un manifiesto CSV (texto, archivo, modelo, duración) para reportar la cobertura.
Variables: DATABASE_URL y, para subir, CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import random
import re
import sys
import unicodedata
from pathlib import Path

# La consola de Windows usa cp1252 y no imprime caracteres como la flecha o la ñ
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
MMS_FOLDER = "simiaru/audio"  # lo que no está aquí es una grabación
MAX_CHARS = 400  # los textos más largos se sintetizan verso por verso


def clean_text(text):
    """Texto normalizado: es la clave del audio y lo que recibe el modelo (las glotalizadas llevan ')."""
    text = unicodedata.normalize("NFC", str(text or "")).lower()
    text = re.sub(r"[’‘´`ʼ]", "'", text)
    text = re.sub(r"\(.*?\)", " ", text)  # quita aclaraciones entre paréntesis
    text = re.sub(r'[.,;:!?¡¿"“”«»]', " ", text)
    return re.sub(r"\s+", " ", text).strip()


def is_recording(url):
    return bool(url) and f"/{MMS_FOLDER}/" not in url


def split_lines(text):
    """Un texto largo se pronuncia entero y por versos, como en el módulo cultural."""
    lines = [line.strip() for line in str(text or "").splitlines() if line.strip()]
    return lines if len(lines) > 1 else []


def pending_texts(texts, existing):
    """Textos sin audio: una entrada por clave, sin repetir y sin tocar lo que ya existe (grabado o MMS)."""
    pending = {}
    for text in texts:
        for candidate in [text, *split_lines(text)]:
            key = clean_text(candidate)
            if key and len(key) <= MAX_CHARS and key not in existing and key not in pending:
                pending[key] = str(candidate).strip()
    return pending


def words_to_link(words, audios):
    """Filas de vocabulario vacías que ya tienen audio para su texto. Nunca incluye una fila con audio."""
    return [(audios[clean_text(w["texto"])], w["id"]) for w in words if not w["audio_url"] and clean_text(w["texto"]) in audios]


def resolve_model(idioma, override=None):
    if override:
        return override
    for pack in (ROOT / "frontend" / "src" / "languages" / f"{idioma}.json", ROOT / "languages" / idioma / "paquete.json"):
        if pack.exists():
            model = json.loads(pack.read_text(encoding="utf-8")).get("voz", {}).get("modelo")
            if model:
                return model
    sys.exit(f'La lengua "{idioma}" no declara voz.modelo en su paquete: usa --modelo facebook/mms-tts-<iso>')


def fetch_words(cur, idioma):
    cur.execute(
        """SELECT v.id, v.palabra_objetivo, v.palabra_espanol, v.audio_url, v.ejemplo_uso
           FROM vocabulario v
           JOIN lecciones l ON v.leccion_id = l.id
           JOIN unidades u ON l.unidad_id = u.id
           WHERE u.idioma = %s ORDER BY v.id""",
        (idioma,),
    )
    return [dict(zip(("id", "texto", "espanol", "audio_url", "ejemplo"), row)) for row in cur.fetchall()]


def fetch_other_texts(cur, idioma, extra_file):
    """Lo demás que la app pronuncia: dictados, textos culturales y las frases fijas de la interfaz."""
    cur.execute(
        """SELECT e.respuesta_correcta FROM ejercicios e
           JOIN lecciones l ON e.leccion_id = l.id
           JOIN unidades u ON l.unidad_id = u.id
           WHERE u.idioma = %s AND e.tipo = 'listen_write'""",
        (idioma,),
    )
    texts = [row[0] for row in cur.fetchall()]
    cur.execute("SELECT contenido_original FROM contenido_cultural WHERE idioma = %s", (idioma,))
    texts += [row[0] for row in cur.fetchall()]
    if extra_file and Path(extra_file).exists():
        texts += json.loads(Path(extra_file).read_text(encoding="utf-8")).get(idioma, [])
    return texts


def sync_recordings(cur, idioma, words):
    """Registra las grabaciones (también las que suba un administrador). Si había audio MMS, gana la voz grabada."""
    for word in words:
        if is_recording(word["audio_url"]):
            cur.execute(
                """INSERT INTO audios (idioma, clave, texto, url, fuente) VALUES (%s, %s, %s, %s, 'grabado')
                   ON CONFLICT (idioma, clave) DO UPDATE
                   SET url = EXCLUDED.url, fuente = 'grabado', modelo = NULL
                   WHERE audios.fuente = 'mms'""",
                (idioma, clean_text(word["texto"]), word["texto"], word["audio_url"]),
            )


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--idioma", required=True)
    parser.add_argument("--modelo", help="Otro modelo MMS, por ejemplo facebook/mms-tts-agr")
    parser.add_argument("--muestra", type=int, default=30, help="Cantidad de palabras al azar para el lote de prueba")
    parser.add_argument("--todo", action="store_true", help="Todos los textos sin audio (en vez de una muestra)")
    parser.add_argument("--semilla", type=int, default=2026, help="Semilla de la muestra (reproducible)")
    parser.add_argument("--textos", help="JSON con las frases fijas de la interfaz (frontend/scripts/export-audio-texts.mjs)")
    parser.add_argument("--salida", default=str(ROOT / "tools" / "tts" / "salida"))
    parser.add_argument("--subir", action="store_true", help="Subir a Cloudinary y guardar en la base")
    parser.add_argument("--confirmar", action="store_true", help="Necesario junto con --subir")
    args = parser.parse_args()

    if args.subir and not (args.confirmar and args.todo):
        sys.exit("--subir modifica la base en línea: se usa junto con --todo y --confirmar.")
    if "DATABASE_URL" not in os.environ:
        sys.exit("Falta DATABASE_URL")

    import numpy as np
    import psycopg
    import soundfile as sf
    import torch
    from transformers import AutoTokenizer, VitsModel

    model_id = resolve_model(args.idioma, args.modelo)
    print(f"Cargando {model_id}…")
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = VitsModel.from_pretrained(model_id)
    model.eval()

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d-%H%M")
    out_dir = Path(args.salida) / f"{args.idioma}-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.subir:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
            api_key=os.environ["CLOUDINARY_API_KEY"],
            api_secret=os.environ["CLOUDINARY_API_SECRET"],
            secure=True,
        )

    with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as conn, conn.cursor() as cur:
        words = fetch_words(cur, args.idioma)
        if args.subir:
            sync_recordings(cur, args.idioma, words)
            cur.execute("SELECT clave FROM audios WHERE idioma = %s", (args.idioma,))
            existing = {row[0] for row in cur.fetchall()}
            texts = [w["texto"] for w in words] + [w["ejemplo"] for w in words if w["ejemplo"]]
            pending = pending_texts(texts + fetch_other_texts(cur, args.idioma, args.textos), existing)
        else:
            sample = [w for w in words if not w["audio_url"]]
            random.Random(args.semilla).shuffle(sample)
            pending = pending_texts([w["texto"] for w in sample[: args.muestra]], set())
        print(f"{len(words)} filas de vocabulario, {len(pending)} textos por generar")

        rows = []
        for i, (key, text) in enumerate(pending.items(), 1):
            inputs = tokenizer(key, return_tensors="pt")
            if inputs["input_ids"].shape[-1] == 0:
                rows.append({"clave": key, "texto": text, "estado": "sin_simbolos_validos"})
                continue
            # La síntesis VITS tiene un componente aleatorio: la semilla por texto hace reproducible cada audio
            torch.manual_seed(int(hashlib.sha256(key.encode("utf-8")).hexdigest()[:8], 16))
            with torch.no_grad():
                wave = model(**inputs).waveform[0].cpu().numpy()
            wave = wave / max(1e-6, float(np.max(np.abs(wave)))) * 0.95  # volumen parejo
            seconds = round(len(wave) / model.config.sampling_rate, 2)
            name = hashlib.sha256(f"{model_id}:{key}".encode("utf-8")).hexdigest()[:16]
            file = out_dir / f"{name}.wav"
            sf.write(file, wave, model.config.sampling_rate)
            row = {"clave": key, "texto": text, "archivo": file.name, "segundos": seconds, "estado": "generado"}

            if args.subir:
                result = cloudinary.uploader.upload(
                    str(file), resource_type="video", folder=f"{MMS_FOLDER}/{args.idioma}", public_id=name, overwrite=True, format="mp3"
                )
                cur.execute(
                    """INSERT INTO audios (idioma, clave, texto, url, fuente, modelo, segundos)
                       VALUES (%s, %s, %s, %s, 'mms', %s, %s) ON CONFLICT (idioma, clave) DO NOTHING""",
                    (args.idioma, key, text, result["secure_url"], model_id, seconds),
                )
                file.unlink()  # el archivo que vale es el de Cloudinary
                row.update(estado="subido", url=result["secure_url"])
            rows.append(row)
            print(f"  [{i}/{len(pending)}] {text[:60]} → {row['estado']}")

        linked = 0
        if args.subir:
            cur.execute("SELECT clave, url FROM audios WHERE idioma = %s", (args.idioma,))
            for url, word_id in words_to_link(words, dict(cur.fetchall())):
                cur.execute("UPDATE vocabulario SET audio_url = %s WHERE id = %s AND (audio_url IS NULL OR audio_url = '')", (url, word_id))
                linked += cur.rowcount

    manifest = out_dir / "manifiesto.csv"
    with manifest.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["clave", "texto", "archivo", "segundos", "estado", "url"], extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    (out_dir / "LEEME.txt").write_text(
        f"Audio sintético generado con {model_id} (licencia CC-BY-NC-4.0) el {stamp}.\n"
        "Es una voz sintética, no la de un hablante nativo.\n",
        encoding="utf-8",
    )
    done = sum(1 for r in rows if r["estado"] in ("generado", "subido"))
    print(f"\nListo: {done}/{len(rows)} audios, {linked} filas de vocabulario enlazadas\nManifiesto: {manifest}")


if __name__ == "__main__":
    main()
