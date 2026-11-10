/**
 * Google-Apps-Script für den Test „Kreis und Zylinder“.
 * Speichert Teilnahmen und Antworten in der Tabelle, an die dieses Skript gebunden ist.
 *
 * Das Passwort des Lehrerbereichs steht NICHT in diesem Code, sondern in den Skripteigenschaften:
 * Projekteinstellungen → Skripteigenschaften → Eigenschaft „ADMIN_PASSWORT“.
 *
 * Die Zahlen jeder Teilnahme entstehen aus einem Startwert (seed), den dieses Skript beim ersten Anmelden vergibt.
 * Ob eine Antwort richtig ist, rechnet der Lehrerbereich aus dem Startwert nach; hier wird nur gespeichert.
 */
const TEILNAHMEN = "Teilnahmen";
const TEILNAHMEN_KOPF = ["NameSchluessel", "Name", "Geraet", "Seed", "Start", "Ende"];
const ANTWORTEN = "Antworten";
const ANTWORTEN_KOPF = ["Zeit", "Name", "Seed", "Aufgabe", "Eingabe"];
const ANZAHL_AUFGABEN = 10;
const MAX_FEHLVERSUCHE = 5; // danach 10 Minuten Sperre für Passworteingaben
const GEBUNDEN = "Dieser Name ist schon auf einem anderen Gerät angemeldet. Bitte wende dich an deine Lehrkraft.";

function doGet() {
  return ContentService.createTextOutput("Das Skript für den Test „Kreis und Zylinder“ läuft.");
}

function doPost(e) {
  let antwort;
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.aktion === "anmelden") antwort = anmelden(d.name, d.geraet);
    else if (d.aktion === "antwort") antwort = speichern(d.name, d.geraet, d.nr, d.eingabe);
    else if (d.aktion === "liste") antwort = mitPasswort(d.passwort, liste);
    else if (d.aktion === "freigeben") antwort = mitPasswort(d.passwort, () => freigeben(d.name));
    else if (d.aktion === "zuruecksetzen") antwort = mitPasswort(d.passwort, () => zuruecksetzen(d.archivieren !== false));
    else antwort = { ok: false, fehler: "Unbekannte Aktion" };
  } catch (err) {
    antwort = { ok: false, fehler: "Fehler im Skript: " + err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(antwort)).setMimeType(ContentService.MimeType.JSON);
}

const namensSchluessel = (n) => String(n || "").trim().replace(/\s+/g, " ").toLowerCase();
const geraetGueltig = (g) => typeof g === "string" && /^[a-z0-9-]{20,64}$/i.test(g);
const nameGueltig = (n) => typeof n === "string" && /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' \-]{0,29}$/.test(n.trim());
const eingabeGueltig = (s) => typeof s === "string" && /^[+-]?\d+([.,]\d+)?$/.test(s) && s.length <= 20;

function blatt(name, kopf) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let b = ss.getSheetByName(name);
  if (!b) {
    b = ss.insertSheet(name);
    b.appendRow(kopf);
    b.setFrozenRows(1);
    // Eingaben wie „12,50“ bleiben Text und werden nicht in Zahlen umgewandelt
    if (name === ANTWORTEN) b.getRange("E:E").setNumberFormat("@");
  }
  return b;
}

const iso = (x) => (x instanceof Date ? x.toISOString() : String(x));

function teilnahmen() {
  return blatt(TEILNAHMEN, TEILNAHMEN_KOPF).getDataRange().getValues().slice(1).filter(function (z) { return z[0] !== ""; }).map(function (z) {
    return { schluessel: String(z[0]), name: String(z[1]), geraet: String(z[2]), seed: Number(z[3]), start: iso(z[4]), ende: z[5] === "" ? "" : iso(z[5]) };
  });
}

function antwortenVon(schluessel) {
  return blatt(ANTWORTEN, ANTWORTEN_KOPF).getDataRange().getValues().slice(1).filter(function (z) {
    return namensSchluessel(z[1]) === schluessel;
  }).map(function (z) { return { nr: Number(z[3]), eingabe: String(z[4]) }; });
}

// Erste Anmeldung: Name wird an dieses Gerät gebunden und bekommt einen Startwert.
// Weitere Anmeldungen vom selben Gerät setzen den Test an der Stelle fort, ohne dass sich Aufgaben ändern.
function anmelden(name, geraet) {
  if (!nameGueltig(name)) return { ok: false, fehler: "Bitte gib nur deinen Vornamen ein." };
  if (!geraetGueltig(geraet)) return { ok: false, fehler: "Keine Gerätekennung" };
  const k = namensSchluessel(name);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const b = blatt(TEILNAHMEN, TEILNAHMEN_KOPF);
    let t = teilnahmen().find(function (x) { return x.schluessel === k; });
    if (t && t.geraet !== geraet) return { ok: false, gebunden: true, fehler: GEBUNDEN };
    if (!t) {
      const seed = Math.floor(Math.random() * 4294967296);
      b.appendRow([k, name.trim().replace(/\s+/g, " "), geraet, seed, new Date(), ""]);
      t = { name: name.trim().replace(/\s+/g, " "), seed: seed, ende: "" };
    }
    return { ok: true, name: t.name, seed: t.seed, antworten: antwortenVon(k), fertig: t.ende !== "" };
  } finally {
    lock.releaseLock();
  }
}

// Eine Antwort je Aufgabe: ist sie schon da, bleibt die erste gültig
function speichern(name, geraet, nr, eingabe) {
  const k = namensSchluessel(name);
  nr = Math.round(Number(nr));
  if (!(nr >= 1 && nr <= ANZAHL_AUFGABEN)) return { ok: false, fehler: "Ungültige Aufgabe" };
  if (!eingabeGueltig(eingabe)) return { ok: false, fehler: "Ungültige Eingabe" };
  if (!geraetGueltig(geraet)) return { ok: false, fehler: "Keine Gerätekennung" };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const alle = teilnahmen();
    const zeile = alle.findIndex(function (x) { return x.schluessel === k; });
    if (zeile < 0) return { ok: false, fehler: "Nicht angemeldet" };
    const t = alle[zeile];
    if (t.geraet !== geraet) return { ok: false, gebunden: true, fehler: GEBUNDEN };
    const bisher = antwortenVon(k);
    const vorhanden = bisher.find(function (a) { return a.nr === nr; });
    if (vorhanden) return { ok: true, schonVorhanden: true, eingabe: vorhanden.eingabe };
    blatt(ANTWORTEN, ANTWORTEN_KOPF).appendRow([new Date(), t.name, t.seed, nr, eingabe]);
    if (bisher.length + 1 >= ANZAHL_AUFGABEN) blatt(TEILNAHMEN, TEILNAHMEN_KOPF).getRange(zeile + 2, 6).setValue(new Date());
    return { ok: true, eingabe: eingabe };
  } finally {
    lock.releaseLock();
  }
}

function mitPasswort(passwort, aktion) {
  const soll = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORT");
  if (!soll) return { ok: false, fehler: "Im Skript ist noch kein ADMIN_PASSWORT eingetragen." };
  const cache = CacheService.getScriptCache();
  const fehlversuche = Number(cache.get("fehlversuche") || 0);
  if (fehlversuche >= MAX_FEHLVERSUCHE) return { ok: false, fehler: "Zu viele falsche Versuche. Bitte in 10 Minuten erneut probieren." };
  if (passwort !== soll) {
    cache.put("fehlversuche", String(fehlversuche + 1), 600);
    Utilities.sleep(1000);
    return { ok: false, fehler: "Falsches Passwort." };
  }
  cache.remove("fehlversuche");
  return aktion();
}

function liste() {
  const antworten = blatt(ANTWORTEN, ANTWORTEN_KOPF).getDataRange().getValues().slice(1).filter(function (z) { return z[1] !== ""; }).map(function (z) {
    return { zeit: iso(z[0]), name: String(z[1]), seed: Number(z[2]), nr: Number(z[3]), eingabe: String(z[4]) };
  });
  const t = teilnahmen().map(function (x) { return { name: x.name, seed: x.seed, start: x.start, ende: x.ende }; });
  return { ok: true, teilnahmen: t, antworten: antworten };
}

// Eine Schülerin oder einen Schüler zurücksetzen: Name, Gerätebindung und Antworten werden gelöscht, der Test beginnt neu
function freigeben(name) {
  const k = namensSchluessel(name);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const t = blatt(TEILNAHMEN, TEILNAHMEN_KOPF), a = blatt(ANTWORTEN, ANTWORTEN_KOPF);
    const tw = t.getDataRange().getValues();
    for (let i = tw.length - 1; i >= 1; i--) if (String(tw[i][0]) === k) t.deleteRow(i + 1);
    const aw = a.getDataRange().getValues();
    for (let i = aw.length - 1; i >= 1; i--) if (namensSchluessel(aw[i][1]) === k) a.deleteRow(i + 1);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Für eine neue Klasse: beide Blätter leeren, auf Wunsch vorher als Archiv sichern
function zuruecksetzen(archivieren) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stempel = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH-mm");
    let archiv = null;
    [[TEILNAHMEN, TEILNAHMEN_KOPF], [ANTWORTEN, ANTWORTEN_KOPF]].forEach(function (p) {
      const b = blatt(p[0], p[1]);
      if (archivieren && b.getLastRow() > 1) {
        archiv = "Archiv " + stempel;
        b.copyTo(ss).setName(p[0] + " " + stempel);
      }
      if (b.getLastRow() > 1) b.deleteRows(2, b.getLastRow() - 1);
    });
    return { ok: true, archiv: archiv };
  } finally {
    lock.releaseLock();
  }
}
