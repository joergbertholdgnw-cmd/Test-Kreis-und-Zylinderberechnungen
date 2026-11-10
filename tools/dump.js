// Gibt Aufgaben und Sollwerte für viele Startwerte als JSON aus (Eingabe für nachrechnen.py).
const A = require("../js/aufgaben.js");
const n = Number(process.argv[2]) || 500;
const aus = [];
for (let seed = 1; seed <= n; seed++) {
  aus.push({ seed: seed * 7919, aufgaben: A.erzeuge(seed * 7919).map((t) => ({ nr: t.nr, afb: t.afb, nk: t.nk, werte: t.werte, loesung: t.loesung, text: t.text })) });
}
process.stdout.write(JSON.stringify(aus));
