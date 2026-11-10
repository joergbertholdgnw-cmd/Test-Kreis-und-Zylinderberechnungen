// Verbindung zum Google-Skript. Ohne SKRIPT_URL läuft alles im Demo-Modus auf diesem Gerät
// (gleiche Regeln wie im Skript: ein Name pro Gerät, jede Aufgabe nur eine Eingabe).
(function () {
  const GERAET = "kz_geraet";
  const DEMO = "kz_demo";

  const lies = (k, ersatz) => { try { return JSON.parse(localStorage.getItem(k)) ?? ersatz; } catch { return ersatz; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* Speicher gesperrt */ } };
  const url = () => (window.KONFIG && window.KONFIG.SKRIPT_URL) || "";
  const schluessel = (n) => String(n || "").trim().replace(/\s+/g, " ").toLowerCase();
  const EINGABE = /^[+-]?\d+([.,]\d+)?$/;

  function geraet() {
    let g = lies(GERAET, "");
    if (!/^[a-z0-9-]{20,64}$/i.test(g)) {
      const z = () => (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join(""));
      g = z().replace(/-/g, "") + z().replace(/-/g, "").slice(0, 8);
      schreib(GERAET, g);
    }
    return g;
  }

  async function anfrage(daten) {
    // text/plain vermeidet die CORS-Vorabanfrage, die Google Apps Script nicht beantwortet
    const antwort = await fetch(url(), { method: "POST", body: JSON.stringify(daten), headers: { "Content-Type": "text/plain;charset=utf-8" } });
    if (!antwort.ok) throw new Error("HTTP " + antwort.status);
    const text = await antwort.text();
    try { return JSON.parse(text); }
    catch { throw new Error("Das Skript antwortet mit einer Webseite statt mit Daten. Bei der Bereitstellung muss „Zugriff: Jeder“ eingestellt sein."); }
  }

  // ---- Demo-Modus: dieselben Regeln wie im Skript, aber im Browser dieses Geräts ----
  const demoLaden = () => lies(DEMO, { teilnahmen: {}, antworten: [] });

  function demoAnmelden(name) {
    const d = demoLaden(), k = schluessel(name);
    let t = d.teilnahmen[k];
    if (!t) {
      t = d.teilnahmen[k] = { name: name.trim(), seed: crypto.getRandomValues(new Uint32Array(1))[0], start: new Date().toISOString(), ende: "" };
      schreib(DEMO, d);
    }
    const eigene = d.antworten.filter((a) => schluessel(a.name) === k).map((a) => ({ nr: a.nr, eingabe: a.eingabe }));
    return { ok: true, name: t.name, seed: t.seed, antworten: eigene, fertig: !!t.ende, demo: true };
  }

  function demoAntwort(name, nr, eingabe) {
    const d = demoLaden(), k = schluessel(name), t = d.teilnahmen[k];
    if (!t) return { ok: false, fehler: "Nicht angemeldet" };
    const vorhanden = d.antworten.find((a) => schluessel(a.name) === k && a.nr === nr);
    if (vorhanden) return { ok: true, schonVorhanden: true, eingabe: vorhanden.eingabe };
    d.antworten.push({ zeit: new Date().toISOString(), name: t.name, seed: t.seed, nr, eingabe });
    if (d.antworten.filter((a) => schluessel(a.name) === k).length >= 10) t.ende = new Date().toISOString();
    schreib(DEMO, d);
    return { ok: true, eingabe };
  }

  // ---- öffentliche Funktionen ----
  async function anmelden(name) {
    if (!url()) return demoAnmelden(name);
    const a = await anfrage({ aktion: "anmelden", name, geraet: geraet() });
    if (!a.ok) return { ok: false, gebunden: !!a.gebunden, fehler: a.fehler || "Unbekannter Fehler" };
    return a;
  }

  async function antwort(name, nr, eingabe) {
    if (!EINGABE.test(eingabe)) return { ok: false, fehler: "Ungültige Eingabe" };
    if (!url()) return demoAntwort(name, nr, eingabe);
    const a = await anfrage({ aktion: "antwort", name, geraet: geraet(), nr, eingabe });
    if (!a.ok) return { ok: false, fehler: a.fehler || "Unbekannter Fehler" };
    return a;
  }

  async function holen(passwort) {
    if (!url()) { const d = demoLaden(); return { ok: true, demo: true, teilnahmen: Object.values(d.teilnahmen), antworten: d.antworten }; }
    return anfrage({ aktion: "liste", passwort });
  }

  async function freigeben(passwort, name) {
    if (!url()) {
      const d = demoLaden(), k = schluessel(name);
      delete d.teilnahmen[k];
      d.antworten = d.antworten.filter((a) => schluessel(a.name) !== k);
      schreib(DEMO, d);
      return { ok: true, demo: true };
    }
    return anfrage({ aktion: "freigeben", passwort, name });
  }

  async function zuruecksetzen(passwort, archivieren) {
    if (!url()) { schreib(DEMO, { teilnahmen: {}, antworten: [] }); return { ok: true, demo: true }; }
    return anfrage({ aktion: "zuruecksetzen", passwort, archivieren });
  }

  window.Speicher = { anmelden, antwort, holen, freigeben, zuruecksetzen, istDemo: () => !url(), EINGABE };
})();
