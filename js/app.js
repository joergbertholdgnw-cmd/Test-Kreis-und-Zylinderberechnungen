// Ablauf des Tests: Startseite (Passwort, Vorname) → zehn Aufgaben nacheinander → Abschluss.
(function () {
  "use strict";
  const A = window.Aufgaben, S = window.Speicher, K = window.KONFIG;
  const app = document.getElementById("app");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NAME = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' \-]{0,29}$/;

  let sitzung = null; // { name, aufgaben, eingaben: Array(10) mit Text oder null }

  const demoHinweis = () => (S.istDemo() ? `<p class="demo">Demo-Modus: Es ist noch kein Google-Skript eingetragen. Die Ergebnisse bleiben nur auf diesem Gerät.</p>` : "");

  // ---------- Startseite ----------
  function start(meldung) {
    sitzung = null;
    app.innerHTML = `
      ${demoHinweis()}
      <section class="karte">
        <h2>Test starten</h2>
        <p class="hinweis">Zehn Aufgaben zu Kreis und Zylinder. Jede Aufgabe hat eigene Zahlen. Jede Antwort kannst du nur <strong>einmal</strong> abgeben. Halte einen Taschenrechner bereit und verwende die π-Taste.</p>
        <form id="f-start" novalidate autocomplete="off">
          <label for="vorname">Dein Vorname</label>
          <input id="vorname" type="text" maxlength="30" autocomplete="off" autocapitalize="words" spellcheck="false">
          <label for="pw">Passwort für den Test</label>
          <input id="pw" type="password" autocomplete="off">
          <p class="meldung" id="meldung" role="alert">${esc(meldung || "")}</p>
          <button class="knopf" type="submit">Test starten</button>
        </form>
      </section>`;
    document.getElementById("vorname").focus();
    document.getElementById("f-start").addEventListener("submit", onStart);
  }

  async function onStart(ev) {
    ev.preventDefault();
    const meld = document.getElementById("meldung"), knopf = ev.target.querySelector("button");
    const name = document.getElementById("vorname").value.trim().replace(/\s+/g, " ");
    const pw = document.getElementById("pw").value.trim();
    if (!NAME.test(name)) { meld.textContent = "Bitte gib deinen Vornamen ein (nur Buchstaben)."; return; }
    if (A.hash(K.START_SALZ + pw) !== K.START_HASH) { meld.textContent = "Das Passwort stimmt nicht."; return; }
    knopf.disabled = true; meld.textContent = "";
    try {
      const a = await S.anmelden(name);
      if (!a.ok) { meld.textContent = a.fehler; knopf.disabled = false; return; }
      sitzung = { name: a.name || name, aufgaben: A.erzeuge(a.seed), eingaben: Array(A.ANZAHL).fill(null) };
      a.antworten.forEach((x) => { if (x.nr >= 1 && x.nr <= A.ANZAHL) sitzung.eingaben[x.nr - 1] = x.eingabe; });
      weiter();
    } catch (e) {
      meld.textContent = "Keine Verbindung zum Speicher. Bitte prüfe das Netz und versuche es noch einmal.";
      knopf.disabled = false;
    }
  }

  // ---------- Aufgaben ----------
  const naechste = () => sitzung.eingaben.findIndex((x) => x === null);
  const richtig = (i) => sitzung.eingaben[i] !== null && A.pruefe(sitzung.aufgaben[i], sitzung.eingaben[i]).ok;

  function fortschritt(aktuell) {
    return `<ol class="fortschritt" aria-label="Fortschritt">${sitzung.eingaben.map((e, i) =>
      `<li class="${e !== null ? "fertig" : i === aktuell ? "jetzt" : ""}"></li>`).join("")}</ol>`;
  }

  function weiter() {
    const i = naechste();
    if (i === -1) return ende();
    aufgabe(i);
  }

  function aufgabe(i, rueck) {
    const t = sitzung.aufgaben[i], beantwortet = sitzung.eingaben[i] !== null;
    const stellen = t.nk === 1 ? "eine Nachkommastelle" : "zwei Nachkommastellen";
    app.innerHTML = `
      ${fortschritt(i)}
      <section class="karte">
        <div class="aufgabenkopf"><h2>Aufgabe ${t.nr} von ${A.ANZAHL}</h2><span class="afb">AFB ${t.afb}</span></div>
        <p class="aufgabentext">${esc(t.text)}</p>
        <form id="f-antwort" novalidate autocomplete="off">
          <label for="antwort">Dein Ergebnis</label>
          <div class="zeile">
            <input id="antwort" type="text" inputmode="decimal" autocomplete="off" ${beantwortet ? "disabled" : ""} value="${beantwortet ? esc(sitzung.eingaben[i]) : ""}" aria-describedby="rundung">
            <span class="einheit">${esc(t.einheit)}</span>
          </div>
          <p class="rundung" id="rundung">Runde auf ${stellen}. Schreibe nur die Zahl, die Einheit steht schon dahinter. Abweichungen bis ${Math.round(A.TOLERANZ * 100)} % vom genauen Ergebnis gelten noch als richtig.</p>
          <p class="meldung" id="meldung" role="alert"></p>
          ${beantwortet ? "" : `<button class="knopf" type="submit">Antwort abgeben</button>`}
        </form>
        <div id="rueck" aria-live="polite">${rueck || ""}</div>
        ${beantwortet ? `<button class="knopf" id="weiter" type="button">${i === A.ANZAHL - 1 ? "Test abschließen" : "Weiter"}</button>` : ""}
      </section>`;
    if (beantwortet) { document.getElementById("weiter").focus(); document.getElementById("weiter").addEventListener("click", weiter); return; }
    document.getElementById("antwort").focus();
    document.getElementById("f-antwort").addEventListener("submit", (ev) => abgeben(ev, i));
  }

  async function abgeben(ev, i) {
    ev.preventDefault();
    const meld = document.getElementById("meldung"), knopf = ev.target.querySelector("button");
    const text = document.getElementById("antwort").value.trim();
    if (!S.EINGABE.test(text)) {
      meld.textContent = "Bitte gib eine Zahl ein, z. B. 12,5 (ohne Einheit). Diese Eingabe zählt noch nicht."; return;
    }
    knopf.disabled = true; meld.textContent = "";
    try {
      const a = await S.antwort(sitzung.name, i + 1, text);
      if (!a.ok) { meld.textContent = a.fehler; knopf.disabled = false; return; }
      sitzung.eingaben[i] = a.eingabe; // gilt die erste Eingabe, auch wenn sie von einem früheren Versuch stammt
      const r = richtig(i);
      aufgabe(i, r ? `<p class="rueck ok">✓ Richtig. Das Ergebnis stimmt.</p>` : `<p class="rueck">Deine Antwort ist gespeichert.</p>`);
    } catch (e) {
      meld.textContent = "Keine Verbindung. Deine Antwort ist noch nicht gespeichert. Bitte versuche es noch einmal.";
      knopf.disabled = false;
    }
  }

  // ---------- Abschluss ----------
  function ende() {
    const n = sitzung.aufgaben.filter((_, i) => richtig(i)).length;
    app.innerHTML = `
      ${fortschritt(-1)}
      <section class="karte">
        <h2>Fertig, ${esc(sitzung.name)}</h2>
        <p class="ergebnis">${n} von ${A.ANZAHL} Aufgaben richtig</p>
        <ul class="chips" aria-label="Ergebnis je Aufgabe">${sitzung.aufgaben.map((t, i) =>
          `<li class="chip ${richtig(i) ? "ok" : ""}" title="Aufgabe ${t.nr}, AFB ${t.afb}">${t.nr} ${richtig(i) ? "✓" : "–"}</li>`).join("")}</ul>
        <p class="hinweis" style="margin-top:1rem">Deine Antworten sind gespeichert und können nicht mehr geändert werden. Du kannst das Fenster jetzt schließen.</p>
        <button class="knopf zweit" id="fertig" type="button">Abmelden</button>
      </section>`;
    document.getElementById("fertig").addEventListener("click", () => start());
  }

  start();
})();
