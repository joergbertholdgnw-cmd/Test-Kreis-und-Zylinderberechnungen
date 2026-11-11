// Aufgaben „Kreis und Zylinder“: zehn Aufgaben (AFB I bis III), deren Zahlen aus einem Startwert (seed) entstehen.
// Derselbe Startwert ergibt immer dieselben Aufgaben; die Lehrkraft rechnet damit im Adminbereich nach.
(function (wurzel) {
  "use strict";

  // Kleiner Zufallsgenerator (mulberry32): gleicher Startwert, gleiche Zahlenfolge
  function zufall(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ganz = (r, von, bis) => von + Math.floor(r() * (bis - von + 1));
  const aus = (r, liste) => liste[Math.floor(r() * liste.length)];
  const schritt = (r, von, bis, s) => Math.round((von + s * ganz(r, 0, Math.round((bis - von) / s))) * 100) / 100;

  // Zahl mit Dezimalkomma, ohne überflüssige Nullen
  const zahl = (x) => String(Number(x.toFixed(2))).replace(".", ",");
  const fest = (x, nk) => x.toFixed(nk).replace(".", ",");
  const PI = Math.PI;
  // Punkte je Aufgabe nach Anforderungsbereich (siehe Erwartungshorizont): 3 · 1 + 4 · 2 + 3 · 2 = 17
  const PUNKTE = { I: 1, II: 2, III: 2 };
  const MAXPUNKTE = 17;

  function erzeuge(seed) {
    const r = zufall(seed);
    const T = [];

    // AFB I: Formel direkt anwenden
    {
      const rad = ganz(r, 4, 15);
      T.push({ afb: "I", titel: "Kreisumfang", einheit: "cm", nk: 2, werte: { r: rad }, loesung: 2 * PI * rad,
        text: `Ein Kreis hat den Radius r = ${zahl(rad)} cm. Berechne den Umfang u des Kreises.` });
    }
    {
      const d = ganz(r, 20, 40);
      T.push({ afb: "I", titel: "Kreisfläche", einheit: "cm²", nk: 1, werte: { d }, loesung: PI * (d / 2) ** 2,
        text: `Eine kreisrunde Pizza hat einen Durchmesser von d = ${zahl(d)} cm. Berechne den Flächeninhalt A der Pizza.` });
    }
    {
      // Höhe und Radius nicht fast gleich, sonst ergäbe auch die Verwechslung V = πrh² das richtige Ergebnis
      let rad, h;
      do { rad = ganz(r, 3, 9); h = ganz(r, 5, 15); } while (Math.abs(h / rad - 1) < 0.25);
      T.push({ afb: "I", titel: "Zylindervolumen", einheit: "cm³", nk: 1, werte: { r: rad, h }, loesung: PI * rad * rad * h,
        text: `Ein Zylinder hat den Radius r = ${zahl(rad)} cm und die Höhe h = ${zahl(h)} cm. Berechne das Volumen V des Zylinders.` });
    }

    // AFB II: Formeln verknüpfen, umstellen, Einheiten umrechnen
    {
      // Höhe nicht viel größer als der Durchmesser: Mantel plus eine Grundfläche läge sonst innerhalb der Toleranz
      const d = ganz(r, 8, 12), h = ganz(r, 8, 14);
      T.push({ afb: "II", titel: "Mantelfläche", einheit: "cm²", nk: 1, werte: { d, h }, loesung: PI * d * h,
        text: `Eine zylinderförmige Konservendose hat einen Durchmesser von d = ${zahl(d)} cm und ist h = ${zahl(h)} cm hoch. Das Etikett bedeckt die Dose rundherum, aber nicht Deckel und Boden. Berechne den Flächeninhalt des Etiketts.` });
    }
    {
      // Höhe höchstens 3 · Radius: Dann liegen Mantelfläche allein oder Mantel mit nur einer Grundfläche deutlich daneben
      let rad, h;
      do { rad = ganz(r, 3, 10); h = ganz(r, rad, Math.min(20, 3 * rad)); } while (Math.abs(rad * h / (2 * (rad + h)) - 1) < 0.25); // V ≠ O
      T.push({ afb: "II", titel: "Oberfläche", einheit: "cm²", nk: 1, werte: { r: rad, h }, loesung: 2 * PI * rad * (rad + h),
        text: `Ein geschlossener Behälter hat die Form eines Zylinders mit dem Radius r = ${zahl(rad)} cm und der Höhe h = ${zahl(h)} cm. Berechne die gesamte Oberfläche O des Behälters.` });
    }
    {
      const r0 = schritt(r, 4, 12, 0.5); // ab r = 4 liegt die Verwechslung mit u = πr² deutlich daneben
      const u = Math.round(2 * PI * r0 * 10) / 10;
      T.push({ afb: "II", titel: "Radius aus dem Umfang", einheit: "cm", nk: 2, werte: { u }, loesung: u / (2 * PI),
        text: `Der Umfang eines Kreises beträgt u = ${zahl(u)} cm. Bestimme den Radius r des Kreises.` });
    }
    {
      const d = aus(r, [50, 60, 70, 80]), h = schritt(r, 70, 110, 5);
      T.push({ afb: "II", titel: "Fassungsvermögen", einheit: "l", nk: 1, werte: { d, h }, loesung: PI * (d / 2) ** 2 * h / 1000,
        text: `Eine zylinderförmige Regentonne hat einen Innendurchmesser von d = ${zahl(d)} cm und eine Innenhöhe von h = ${zahl(h)} cm. Berechne, wie viele Liter Wasser höchstens hineinpassen. (1 l = 1 000 cm³)` });
    }

    // AFB III: Sachsituation modellieren, mehrschrittig oder ohne direkte Formel
    {
      // Länge und Breite deutlich verschieden, damit Aufrollen in der falschen Richtung nicht dasselbe Volumen ergibt
      let a, b;
      do { a = schritt(r, 40, 90, 5); b = schritt(r, 20, 50, 5); } while (Math.abs(a / b - 1) < 0.25);
      T.push({ afb: "III", titel: "Blech zum Zylinder", einheit: "cm³", nk: 1, werte: { a, b }, loesung: a * a * b / (4 * PI),
        text: `Ein rechteckiges Blech ist ${zahl(a)} cm lang und ${zahl(b)} cm breit. Es wird ohne Überlappung zu einem Zylindermantel gebogen. Dabei wird die Länge von ${zahl(a)} cm zum Umfang der Grundfläche, die Breite von ${zahl(b)} cm ist die Höhe. Ermittle das Volumen dieses Zylinders.` });
    }
    {
      // p nicht klein: Sonst läge die lineare Näherung „2p“ innerhalb der Toleranz
      const p = aus(r, [30, 40, 50, 60, 80]), rad = ganz(r, 3, 8), h = ganz(r, 5, 15);
      T.push({ afb: "III", titel: "Änderung des Volumens", einheit: "%", nk: 1, werte: { p, r: rad, h }, loesung: ((1 + p / 100) ** 2 - 1) * 100,
        text: `Bei einem Zylinder mit dem Radius r = ${zahl(rad)} cm und der Höhe h = ${zahl(h)} cm wird der Radius um ${p} % vergrößert. Die Höhe bleibt gleich. Ermittle, um wie viel Prozent das Volumen zunimmt.` });
    }
    {
      // Radius des Gefäßes höchstens 3 · r: Sonst läge das Teilen durch die freie Ringfläche (R² − r²) innerhalb der Toleranz
      const rad = ganz(r, 2, 4), h = ganz(r, 6, 12), R = ganz(r, 5, Math.min(8, 3 * rad));
      T.push({ afb: "III", titel: "Wasserspiegel steigt", einheit: "cm", nk: 2, werte: { r: rad, h, R }, loesung: rad * rad * h / (R * R),
        text: `Ein zylinderförmiges Gefäß mit dem Innenradius R = ${zahl(R)} cm enthält Wasser. Ein massiver Metallzylinder mit dem Radius r = ${zahl(rad)} cm und der Höhe h = ${zahl(h)} cm wird vollständig untergetaucht. Das Wasser steht schon vorher höher als der Zylinder und läuft nicht über. Bestimme, um wie viele Zentimeter der Wasserspiegel steigt.` });
    }

    return T.map((t, i) => Object.assign({ nr: i + 1, punkte: PUNKTE[t.afb] }, t));
  }

  // Eingabe mit Komma oder Punkt; Einheit und Tausenderpunkte werden nicht akzeptiert
  function lies(eingabe) {
    const t = String(eingabe == null ? "" : eingabe).trim().replace(/\s+/g, "").replace(",", ".");
    return /^[+-]?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
  }

  // Richtig, wenn die Abweichung vom Sollwert höchstens 5 % beträgt. Damit sind Rundungen und π ≈ 3,14 erlaubt;
  // π ≈ 3 weicht um 4,5 bis 4,7 % ab und geht gerade noch durch, zusammen mit Zwischenrundungen aber nicht sicher.
  // tools/pruefe-fehlbilder.js stellt sicher, dass typische Fehlrechnungen bei den erzeugten Zahlen deutlich außerhalb liegen.
  const TOLERANZ = 0.05;
  const toleranz = (soll) => TOLERANZ * Math.abs(soll) + 1e-9;

  function pruefe(aufgabe, eingabe) {
    const x = lies(eingabe);
    if (x === null) return { gueltig: false, ok: false };
    return { gueltig: true, ok: Math.abs(x - aufgabe.loesung) <= toleranz(aufgabe.loesung), wert: x };
  }

  // Einfacher Hash (cyrb53), nur damit Passwörter nicht im Klartext im Quelltext stehen
  function hash(s) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // Note aus dem Prozentanteil; schluessel = [[ab Prozent, Note], …] absteigend, darunter 6
  function note(prozent, schluessel) {
    for (const [ab, n] of schluessel) if (prozent >= ab - 1e-9) return n;
    return 6;
  }

  const api = { erzeuge, pruefe, lies, toleranz, hash, zahl, fest, note, ANZAHL: 10, MAXPUNKTE, TOLERANZ };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else wurzel.Aufgaben = api;
})(typeof window !== "undefined" ? window : globalThis);
