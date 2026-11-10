"""Unabhängige Zweitrechnung aller Sollwerte mit sympy.

Aufruf (im Ordner des Materials):  python tools/nachrechnen.py
Die Formeln stehen hier getrennt von js/aufgaben.js, damit ein Fehler an einer der beiden Stellen auffällt.
"""
import json
import subprocess
import sys
from pathlib import Path

import sympy as sp

ordner = Path(__file__).resolve().parent
roh = subprocess.run(["node", str(ordner / "dump.js"), "500"], capture_output=True, check=True, encoding="utf-8").stdout
daten = json.loads(roh)

r, h, d, u, a, b, R, p = sp.symbols("r h d u a b R p", positive=True)

# Formeln in exakter Form; sp.pi bleibt symbolisch, erst am Ende wird numerisch ausgewertet
formeln = {
    1: (2 * sp.pi * r, ["r"]),
    2: (sp.pi * (d / 2) ** 2, ["d"]),
    3: (sp.pi * r**2 * h, ["r", "h"]),
    4: (2 * sp.pi * (d / 2) * h, ["d", "h"]),
    5: (2 * sp.pi * r**2 + 2 * sp.pi * r * h, ["r", "h"]),
    6: (u / (2 * sp.pi), ["u"]),
    7: (sp.pi * (d / 2) ** 2 * h / 1000, ["d", "h"]),
    # Blech: a = 2*pi*r  =>  r = a/(2 pi), V = pi r^2 b
    8: (sp.pi * (a / (2 * sp.pi)) ** 2 * b, ["a", "b"]),
    # Radius um p % größer: V_neu / V_alt - 1, mit konkreten r und h gerechnet (π kürzt sich nicht heraus, soll aber gleich bleiben)
    9: ((sp.pi * (r * (1 + p / 100)) ** 2 * h) / (sp.pi * r**2 * h) * 100 - 100, ["r", "h", "p"]),
    # Verdrängtes Volumen = Volumen des Metallzylinders = pi R^2 * Δh
    10: (sp.pi * r**2 * h / (sp.pi * R**2), ["r", "h", "R"]),
}
symbole = {"r": r, "h": h, "d": d, "u": u, "a": a, "b": b, "R": R, "p": p}

fehler = 0
for eintrag in daten:
    for t in eintrag["aufgaben"]:
        ausdruck, namen = formeln[t["nr"]]
        einsetzen = {symbole[n]: sp.nsimplify(t["werte"][n]) for n in namen}
        soll = float(ausdruck.subs(einsetzen).evalf(30))
        if abs(soll - t["loesung"]) > 1e-9 * max(1, abs(soll)):
            fehler += 1
            print(f"ABWEICHUNG Startwert {eintrag['seed']} Aufgabe {t['nr']}: JS {t['loesung']} / sympy {soll}")

print(f"{len(daten)} Startwerte × 10 Aufgaben geprüft, Abweichungen: {fehler}")
sys.exit(1 if fehler else 0)
