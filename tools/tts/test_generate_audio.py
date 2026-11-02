"""Pruebas del proceso de audio. No necesitan modelos, base ni red: python -m unittest test_generate_audio.py"""
import json
import unittest
from pathlib import Path

import generate_audio as ga

GRABADA = "https://res.cloudinary.com/x/video/upload/v1/allillanchu_n5wnjx.ogg"
SUBIDA_POR_ADMIN = "https://res.cloudinary.com/x/video/upload/v1/simiaru/audios/palabra_1.mp3"
MMS = "https://res.cloudinary.com/x/video/upload/v1/simiaru/audio/quechua/abc.mp3"


class Normalizacion(unittest.TestCase):
    def test_misma_clave_que_el_backend_y_el_frontend(self):
        vectors = json.loads((Path(__file__).parent / "audio_key_vectors.json").read_text(encoding="utf-8"))
        for text, key in vectors:
            self.assertEqual(ga.clean_text(text), key)

    def test_conserva_glotalizadas_y_aspiradas(self):
        self.assertEqual(ga.clean_text("Q’ipi"), "q'ipi")
        self.assertEqual(ga.clean_text("Khipu"), "khipu")


class VocesGrabadas(unittest.TestCase):
    def test_distingue_grabaciones_de_audio_mms(self):
        self.assertTrue(ga.is_recording(GRABADA))
        self.assertTrue(ga.is_recording(SUBIDA_POR_ADMIN))
        self.assertFalse(ga.is_recording(MMS))
        self.assertFalse(ga.is_recording(None))

    def test_no_se_genera_lo_que_ya_tiene_audio(self):
        pending = ga.pending_texts(["Allillanchu", "Wasi", "wasi", "Allin p’unchay"], {"allillanchu"})
        self.assertEqual(list(pending), ["wasi", "allin p'unchay"])

    def test_una_fila_con_audio_nunca_se_enlaza(self):
        words = [
            {"id": 1, "texto": "Allillanchu", "audio_url": GRABADA},
            {"id": 2, "texto": "Allillanchu", "audio_url": None},
            {"id": 3, "texto": "Wasi", "audio_url": ""},
            {"id": 4, "texto": "Sin audio aún", "audio_url": None},
        ]
        links = ga.words_to_link(words, {"allillanchu": GRABADA, "wasi": MMS})
        self.assertEqual(links, [(GRABADA, 2), (MMS, 3)])


class Textos(unittest.TestCase):
    def test_las_canciones_tambien_se_generan_verso_por_verso(self):
        pending = ga.pending_texts(["Primer verso\nSegundo verso"], set())
        self.assertEqual(set(pending), {"primer verso segundo verso", "primer verso", "segundo verso"})

    def test_un_texto_demasiado_largo_se_omite_pero_no_sus_versos(self):
        pending = ga.pending_texts(["\n".join(["palabra " * 20] * 5)], set())
        self.assertEqual(len(pending), 1)


class Modelo(unittest.TestCase):
    def test_cada_lengua_toma_el_modelo_de_su_paquete(self):
        self.assertEqual(ga.resolve_model("quechua"), "facebook/mms-tts-quz")
        self.assertEqual(ga.resolve_model("aymara"), "facebook/mms-tts-ayr")
        self.assertEqual(ga.resolve_model("awajun"), "facebook/mms-tts-agr")
        self.assertEqual(ga.resolve_model("quechua", "otro/modelo"), "otro/modelo")


if __name__ == "__main__":
    unittest.main()
