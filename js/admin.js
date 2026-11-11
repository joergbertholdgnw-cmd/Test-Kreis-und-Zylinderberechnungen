// Lehrerbereich: Ergebnisse je Person und je Aufgabe, CSV-Export, Zurücksetzen.
// Ob eine Antwort richtig ist, wird hier aus dem Startwert neu berechnet; die Tabelle speichert nur die Eingaben.
(function () {
  "use strict";
  const A = window.Aufgaben, S = window.Speicher, K = window.KONFIG;
  const wurzel = document.getElementById("admin");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const schluessel = (n) => String(n || "").trim().replace(/\s+/g, " ").toLowerCase();
  const zeit = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); };

  let passwort = "";

  function login(meldung) {
    wurzel.innerHTML = `
      ${S.istDemo() ? `<p class="demo">Demo-Modus: Es ist noch kein Google-Skript eingetragen. Angezeigt werden die Ergebnisse dieses Geräts, jedes Passwort wird angenommen.</p>` : ""}
      <section class="karte">
        <h2>Anmelden</h2>
        <form id="f-login" novalidate>
          <label for="pw">Passwort des Lehrerbereichs</label>
          <input id="pw" type="password" autocomplete="off">
          <p class="meldung" id="meldung" role="alert">${esc(meldung || "")}</p>
          <button class="knopf" type="submit">Öffnen</button>
        </form>
      </section>`;
    document.getElementById("pw").focus();
    document.getElementById("f-login").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      passwort = document.getElementById("pw").value;
      if (!passwort) return;
      ev.target.querySelector("button").disabled = true;
      await laden();
    });
  }

  async function laden() {
    let d;
    try { d = await S.holen(passwort); }
    catch (e) { return login("Keine Verbindung zum Speicher: " + e.message); }
    if (!d.ok) { passwort = ""; return login(d.fehler); }
    anzeigen(d);
  }

  // Je Teilnahme: Aufgaben aus dem Startwert, Eingaben aus der Tabelle, Richtig/Falsch neu gerechnet
  function auswerten(d) {
    return d.teilnahmen.map((t) => {
      const aufgaben = A.erzeuge(t.seed), k = schluessel(t.name);
      const eingaben = Array(A.ANZAHL).fill(null);
      d.antworten.filter((a) => schluessel(a.name) === k && a.seed === t.seed).forEach((a) => { if (a.nr >= 1 && a.nr <= A.ANZAHL) eingaben[a.nr - 1] = String(a.eingabe).replace(/^'/, ""); });
      const ok = aufgaben.map((a, i) => (eingaben[i] === null ? null : A.pruefe(a, eingaben[i]).ok));
      const richtige = ok.filter((x) => x === true).length;
      const punkte = aufgaben.reduce((s, a, i) => s + (ok[i] === true ? a.punkte : 0), 0);
      // Eine Note gibt es erst, wenn alle Aufgaben beantwortet sind
      const note = t.ende ? A.note(100 * punkte / A.MAXPUNKTE, K.NOTENSCHLUESSEL) : null;
      return { t, aufgaben, eingaben, ok, richtige, punkte, note, beantwortet: eingaben.filter((x) => x !== null).length };
    }).sort((a, b) => a.t.name.localeCompare(b.t.name, "de"));
  }

  function anzeigen(d) {
    const L = auswerten(d);
    const muster = A.erzeuge(1); // AFB und Titel sind für alle Startwerte gleich
    const quoten = muster.map((m, i) => {
      const da = L.filter((p) => p.ok[i] !== null);
      return { n: da.length, richtig: da.filter((p) => p.ok[i]).length, afb: m.afb, titel: m.titel };
    });
    wurzel.innerHTML = `
      ${S.istDemo() ? `<p class="demo">Demo-Modus: Angezeigt werden die Ergebnisse dieses Geräts.</p>` : ""}
      <div class="leiste">
        <button class="knopf klein" id="neu" type="button">Aktualisieren</button>
        <button class="knopf klein zweit" id="csv" type="button" ${L.length ? "" : "disabled"}>Als CSV speichern</button>
        <button class="knopf klein zweit" id="alle" type="button" ${L.length ? "" : "disabled"}>Alle Ergebnisse löschen</button>
        <button class="link" id="raus" type="button">Abmelden</button>
      </div>
      <p class="meldung" id="meldung" role="alert"></p>
      <section class="karte">
        <h2>${L.length} ${L.length === 1 ? "Teilnahme" : "Teilnahmen"}, ${L.filter((p) => p.t.ende).length} abgeschlossen</h2>
        ${spiegel(L)}
        <p class="hinweis" style="margin:0">Lösungsquote je Aufgabe (nur unter denen, die sie schon beantwortet haben):</p>
        <ul class="quoten">${quoten.map((q, i) => `<li title="${esc(q.titel)}">Aufg. ${i + 1} · AFB ${q.afb}<b>${q.n ? Math.round(100 * q.richtig / q.n) + " %" : "–"}</b><span class="balken"><i style="width:${q.n ? 100 * q.richtig / q.n : 0}%"></i></span></li>`).join("")}</ul>
      </section>
      ${L.length ? uebersicht(L, muster) : `<section class="karte"><p class="hinweis" style="margin:0">Noch keine Teilnahmen. Sobald sich jemand mit Vornamen und Startpasswort anmeldet, erscheint sie oder er hier.</p></section>`}`;

    document.getElementById("neu").addEventListener("click", laden);
    document.getElementById("raus").addEventListener("click", () => { passwort = ""; login(); });
    document.getElementById("csv").addEventListener("click", () => exportieren(L));
    bestaetigen(document.getElementById("alle"), "Wirklich alle löschen?", async () => {
      const r = await S.zuruecksetzen(passwort, true);
      if (!r.ok) return meldung(r.fehler);
      await laden();
      meldung(r.archiv ? `Gelöscht. Vorher gesichert als „${r.archiv}“ in der Tabelle.` : "Gelöscht.", true);
    });
    wurzel.querySelectorAll("[data-auf]").forEach((b) => b.addEventListener("click", () => {
      const zeileDetail = document.getElementById("detail-" + b.dataset.auf);
      zeileDetail.hidden = !zeileDetail.hidden;
      b.setAttribute("aria-expanded", String(!zeileDetail.hidden));
      b.firstElementChild.textContent = zeileDetail.hidden ? "▸ " : "▾ ";
    }));
    wurzel.querySelectorAll("[data-loeschen]").forEach((b) => bestaetigen(b, "Wirklich zurücksetzen?", async () => {
      const r = await S.freigeben(passwort, b.dataset.loeschen);
      if (!r.ok) return meldung(r.fehler);
      await laden();
    }));
  }

  // Notenspiegel und Durchschnitt über alle abgeschlossenen Teilnahmen
  function spiegel(L) {
    const fertig = L.filter((p) => p.note !== null);
    if (!fertig.length) return `<p class="hinweis">Noten erscheinen, sobald jemand alle zehn Aufgaben beantwortet hat. Schlüssel: ${schluesselText()}.</p>`;
    const zahl = [1, 2, 3, 4, 5, 6].map((n) => `${n}: ${fertig.filter((p) => p.note === n).length}`).join(" · ");
    const schnitt = fertig.reduce((s, p) => s + p.note, 0) / fertig.length;
    return `<p class="hinweis" style="margin-bottom:0.5rem"><strong>Notenspiegel</strong> (${zahl}), Durchschnitt ${A.zahl(schnitt)}.<br>Schlüssel: ${schluesselText()}.</p>`;
  }
  function schluesselText() {
    const s = K.NOTENSCHLUESSEL;
    return s.map(([ab, n]) => `Note ${n} ab ${ab} %`).join(", ") + ", darunter Note 6";
  }

  // Eine Zeile je Person: Punkte, Note und das Ergebnis jeder Aufgabe nebeneinander; Klick auf den Namen zeigt die Einzelheiten
  function uebersicht(L, muster) {
    return `<div class="tabelle"><table class="ergebnisse">
      <thead><tr><th>Vorname</th><th>Punkte</th><th>Note</th>${muster.map((m, i) => `<th class="c" title="${esc(m.titel)}">${i + 1}<small>AFB ${m.afb}</small></th>`).join("")}<th>Stand</th></tr></thead>
      <tbody>${L.map(zeile).join("")}</tbody></table></div>`;
  }

  function zeile(p, idx) {
    const status = p.t.ende ? "abgeschlossen" : `${p.beantwortet} von ${A.ANZAHL}`;
    const zellen = p.ok.map((o, i) => {
      const a = p.aufgaben[i];
      const hinweis = p.eingaben[i] === null ? `Aufgabe ${a.nr}: noch nicht beantwortet` : `Aufgabe ${a.nr}: Eingabe ${p.eingaben[i]} ${a.einheit}, Lösung ${A.fest(a.loesung, a.nk)} ${a.einheit}`;
      return `<td class="c ${o === true ? "ok-text" : o === false ? "nein-text" : "offen-text"}" title="${esc(hinweis)}">${o === true ? "✓" : o === false ? "✗" : "·"}</td>`;
    }).join("");
    return `<tr class="person-zeile">
      <td><button class="link name" type="button" data-auf="${idx}" aria-expanded="false"><span aria-hidden="true">▸ </span>${esc(p.t.name)}</button></td>
      <td class="zahl">${p.punkte} / ${A.MAXPUNKTE}</td>
      <td class="c"><b>${p.note === null ? "–" : p.note}</b></td>
      ${zellen}
      <td class="stand">${esc(status)} · ${esc(zeit(p.t.start))}</td>
    </tr>
    <tr class="detail" id="detail-${idx}" hidden><td colspan="${A.ANZAHL + 4}">${detail(p)}</td></tr>`;
  }

  function detail(p) {
    return `<div class="tabelle"><table>
        <thead><tr><th>Nr.</th><th>AFB</th><th>Aufgabe</th><th>Eingabe</th><th>Lösung</th><th>Punkte</th></tr></thead>
        <tbody>${p.aufgaben.map((a, i) => `<tr>
          <td>${a.nr}</td><td>${a.afb}</td><td>${esc(a.titel)}</td>
          <td class="zahl">${p.eingaben[i] === null ? "–" : esc(p.eingaben[i]) + " " + esc(a.einheit)}</td>
          <td class="zahl">${A.fest(a.loesung, a.nk)} ${esc(a.einheit)}</td>
          <td>${p.ok[i] === true ? '<span class="ok-text">✓</span> ' : p.ok[i] === false ? '<span class="nein-text">✗</span> ' : ""}${p.ok[i] === null ? "" : (p.ok[i] ? a.punkte : 0) + " / " + a.punkte}</td></tr>`).join("")}</tbody>
      </table></div>
      <details style="margin-top:0.75rem"><summary class="link" style="cursor:pointer">Aufgabentexte dieser Person</summary>
        <ol style="font-family:var(--sans);font-size:0.85rem;padding-left:1.2rem">${p.aufgaben.map((a) => `<li>${esc(a.text)}</li>`).join("")}</ol>
      </details>
      <button class="knopf klein zweit" type="button" data-loeschen="${esc(p.t.name)}" style="margin-top:0.75rem">Zurücksetzen (neuer Versuch)</button>`;
  }

  // Zweistufig (erst klicken, dann bestätigen), damit ein Fehlklick nichts löscht
  function bestaetigen(knopf, text, aktion) {
    if (!knopf) return;
    const original = knopf.textContent;
    let bereit = false, timer = 0;
    knopf.addEventListener("click", async () => {
      if (!bereit) {
        bereit = true; knopf.textContent = text;
        timer = setTimeout(() => { bereit = false; knopf.textContent = original; }, 4000);
        return;
      }
      clearTimeout(timer); knopf.disabled = true;
      await aktion();
    });
  }

  function meldung(text, gut) {
    const m = document.getElementById("meldung");
    if (m) { m.textContent = text; m.style.color = gut ? "var(--ok)" : ""; }
  }

  function exportieren(L) {
    const feld = (x) => `"${String(x).replace(/"/g, '""')}"`;
    const kopf = ["Vorname", "Beginn", "Ende", "Richtig", "Punkte", "Note"].concat(Array.from({ length: A.ANZAHL }, (_, i) => `A${i + 1} Eingabe`), Array.from({ length: A.ANZAHL }, (_, i) => `A${i + 1} richtig`));
    const zeilen = L.map((p) => [p.t.name, p.t.start, p.t.ende, p.richtige, p.punkte, p.note === null ? "" : p.note].concat(p.eingaben.map((e) => (e === null ? "" : e)), p.ok.map((o) => (o === null ? "" : o ? 1 : 0))));
    const text = "﻿" + [kopf].concat(zeilen).map((z) => z.map(feld).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = "ergebnisse-kreis-zylinder.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  login();
})();
