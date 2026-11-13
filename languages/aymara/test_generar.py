"""Pruebas de la conversión de IDS al alfabeto aymara oficial (python -m unittest test_generar.py)."""
import unittest

from generar_desde_ids import to_practical


class Ortografia(unittest.TestCase):
    def test_glotalizadas_y_aspiradas(self):
        self.assertEqual(to_practical("čˀumi"), "ch'umi")
        self.assertEqual(to_practical("čʰulʸunkʰiya"), "chhullunkhiya")
        self.assertEqual(to_practical("ḳʰana"), "qhana")
        self.assertEqual(to_practical("kˀuti"), "k'uti")
        self.assertEqual(to_practical("tˀiri"), "t'iri")
        self.assertEqual(to_practical("pʰaxsi"), "phajsi")

    def test_fricativas_velar_y_uvular(self):
        self.assertEqual(to_practical("xawira"), "jawira")  # x de IDS = j
        self.assertEqual(to_practical("sarχa-ɲa"), "sarxaña")  # χ de IDS = x

    def test_palatales_y_vocal_larga(self):
        self.assertEqual(to_practical("ɲiḳˀi"), "ñiq'i")
        self.assertEqual(to_practical("kuurmi"), "kürmi")

    def test_guiones(self):
        self.assertEqual(to_practical("ḳuta-ɲa"), "qutaña")  # sufijo corto: pegado
        self.assertEqual(to_practical("wara-wara"), "wara wara")  # compuesto: separado
        self.assertEqual(to_practical("mama-ḳuta"), "mama quta")


if __name__ == "__main__":
    unittest.main()
