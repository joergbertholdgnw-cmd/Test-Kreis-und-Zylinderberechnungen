// Prüft als „kritische Lehrkraft“: Liegt bei den erzeugten Zahlen eine typische Fehlrechnung zufällig innerhalb der Toleranz?
// Aufruf:  node tools/pruefe-fehlbilder.js [Anzahl Startwerte]
// Ausgabe je Aufgabe: kleinster Abstand der Fehlrechnungen vom Sollwert (in %). Er muss deutlich über der Toleranz liegen.
const A = require("../js/aufgaben.js");
const n = Number(process.argv[2]) || 20000;
const PI = Math.PI;
const SICHERHEIT = 0.02; // Abstand mindestens Toleranz + 2 Prozentpunkte

// Fehlrechnungen je Aufgabe: [Beschreibung, Wert]
const fehler = {
  1: (w) => [["Fläche πr² statt Umfang", PI * w.r ** 2], ["Halber Umfang πr", PI * w.r], ["Umfang mit Radius quadriert 2πr²", 2 * PI * w.r ** 2], ["nur 2r", 2 * w.r]],
  2: (w) => [["d statt r: πd²", PI * w.d ** 2], ["Umfang πd", PI * w.d], ["πr", PI * w.d / 2], ["2πr", PI * w.d]],
  3: (w) => [["πrh²", PI * w.r * w.h ** 2], ["πrh", PI * w.r * w.h], ["d statt r", PI * (2 * w.r) ** 2 * w.h], ["Kegel", PI * w.r ** 2 * w.h / 3], ["nur Grundfläche", PI * w.r ** 2]],
  4: (w) => [["2πdh (d als r)", 2 * PI * w.d * w.h], ["πrh", PI * w.d / 2 * w.h], ["Oberfläche statt Mantel", PI * w.d * w.h + 2 * PI * (w.d / 2) ** 2], ["Mantel + 1 Deckel", PI * w.d * w.h + PI * (w.d / 2) ** 2], ["Volumen", PI * (w.d / 2) ** 2 * w.h]],
  5: (w) => [["nur Mantel", 2 * PI * w.r * w.h], ["Mantel + 1 Grundfläche", 2 * PI * w.r * w.h + PI * w.r ** 2], ["πr(r+h) ohne 2", PI * w.r * (w.r + w.h)], ["Volumen", PI * w.r ** 2 * w.h], ["2 Grundflächen allein", 2 * PI * w.r ** 2]],
  6: (w) => [["r = u/π (Durchmesser)", w.u / PI], ["r = √(u/π)", Math.sqrt(w.u / PI)], ["r = u/2", w.u / 2], ["r = u/(4π)", w.u / (4 * PI)]],
  7: (w) => [["ohne Umrechnung (cm³)", PI * (w.d / 2) ** 2 * w.h], ["d als r", PI * w.d ** 2 * w.h / 1000], ["Umrechnung durch 100", PI * (w.d / 2) ** 2 * w.h / 100], ["Umrechnung durch 10 000", PI * (w.d / 2) ** 2 * w.h / 10000]],
  8: (w) => [["a als Radius", PI * w.a ** 2 * w.b], ["a als Durchmesser", PI * (w.a / 2) ** 2 * w.b], ["a²b/π (r = a/π)", w.a ** 2 * w.b / PI], ["Rechteckfläche a·b", w.a * w.b], ["Mantel statt Volumen", w.a * w.b], ["V = π r² a (Rollen längs der Breite)", PI * (w.b / (2 * PI)) ** 2 * w.a]],
  9: (w) => [["p statt (1+p)²−1", w.p], ["lineare Näherung 2p", 2 * w.p], ["neues Volumen in % (ohne −100)", (1 + w.p / 100) ** 2 * 100], ["Kubik (1+p)³−1", ((1 + w.p / 100) ** 3 - 1) * 100]],
  10: (w) => [["Quadrat vergessen: rh/R", w.r * w.h / w.R], ["r²h/R", w.r ** 2 * w.h / w.R], ["Volumen statt Höhe", PI * w.r ** 2 * w.h], ["Δh = h", w.h], ["Grundfläche des Metallzylinders: V/(πr²)", w.h], ["r²h/(R²−r²)", w.r ** 2 * w.h / (w.R ** 2 - w.r ** 2)]],
};

const min = {};
let verstoesse = 0;
for (let seed = 1; seed <= n; seed++) {
  for (const t of A.erzeuge(seed * 104729)) {
    for (const [name, wert] of fehler[t.nr](t.werte)) {
      const abstand = Math.abs(wert - t.loesung) / Math.abs(t.loesung);
      if (!min[t.nr] || abstand < min[t.nr].abstand) min[t.nr] = { abstand, name, werte: t.werte };
      if (abstand < A.TOLERANZ + SICHERHEIT) verstoesse++;
    }
  }
}
for (let nr = 1; nr <= 10; nr++) {
  const m = min[nr];
  console.log(`Aufgabe ${String(nr).padStart(2)}: kleinster Abstand ${(100 * m.abstand).toFixed(1).padStart(6)} %  (${m.name}; ${JSON.stringify(m.werte)})`);
}
console.log(`${n} Startwerte, Fehlrechnungen innerhalb Toleranz + ${100 * SICHERHEIT} Punkte: ${verstoesse}`);
process.exit(verstoesse ? 1 : 0);
