# Test „Kreis und Zylinder“ (Jahrgang 10)

Online-Test mit zehn Aufgaben zu Kreis und Zylinder, gestaffelt nach Anforderungsbereichen:

| Aufgaben | AFB | Inhalt |
|---|---|---|
| 1–3 | I | Kreisumfang, Kreisfläche (aus dem Durchmesser), Zylindervolumen |
| 4–7 | II | Mantelfläche, Oberfläche, Radius aus dem Umfang, Fassungsvermögen in Litern |
| 8–10 | III | Blech zum Zylinder biegen, prozentuale Volumenänderung, Wasserspiegel beim Eintauchen |

## Ablauf für die Schülerinnen und Schüler

1. Vornamen und Startpasswort eingeben (das Passwort sagt die Lehrkraft erst zu Beginn des Tests).
2. Die Aufgaben erscheinen nacheinander, **jede mit eigenen Zahlen**. Die Zahlen entstehen aus einem Startwert, den das Skript beim ersten Anmelden vergibt.
3. Jede Antwort kann nur **einmal** abgegeben werden. Eine richtige Antwort wird bestätigt („✓ Richtig“), bei einer falschen steht nur „Deine Antwort ist gespeichert“. Lösungen werden nicht gezeigt.
4. Wer die Seite neu lädt oder sich mit demselben Vornamen wieder anmeldet, bekommt dieselben Aufgaben und macht dort weiter, wo er aufgehört hat. Der Name ist an das erste Gerät gebunden.

Als richtig gilt eine Zahl, wenn sie höchstens eine halbe Einheit der verlangten letzten Stelle oder 0,5 % vom Sollwert abweicht. Dann sind Zwischenrundungen und π ≈ 3,14 erlaubt, π ≈ 3 nicht.

## Lehrerbereich (`admin.html`)

Nach Passworteingabe: Teilnahmen mit Punkten und Ergebnis je Aufgabe, Lösungsquote je Aufgabe, je Person die Eingaben mit Sollwerten und den Aufgabentexten, CSV-Export, „Zurücksetzen“ einzelner Personen (neuer Versuch) und „Alle Ergebnisse löschen“ (mit Archiv in der Tabelle). Richtig oder falsch wird dort aus dem Startwert neu berechnet; die Tabelle enthält nur die Eingaben.

## Einrichtung (einmalig, etwa 10 Minuten)

Wie bei den anderen Lernapps: statische Webseite plus Google-Skript, das die Ergebnisse in eine Tabelle schreibt. Für diesen Test eine **eigene** Tabelle mit eigenem Skript anlegen.

1. Neue Google-Tabelle anlegen, Menü **Erweiterungen → Apps Script**.
2. Inhalt von [`apps-script/Code.gs`](apps-script/Code.gs) in `Code.gs` kopieren und speichern.
3. **Projekteinstellungen → Skripteigenschaften**: Eigenschaft `ADMIN_PASSWORT` mit dem Passwort des Lehrerbereichs anlegen. Das Passwort steht bewusst nicht im Repository.
4. **Bereitstellen → Neue Bereitstellung → Web-App**, Ausführen als „Ich“, Zugriff „Jeder“. Die URL (endet auf `/exec`) kopieren.
5. In [`js/config.js`](js/config.js) die URL bei `SKRIPT_URL` eintragen.
6. Mit GitHub Pages veröffentlichen (Settings → Pages). Test unter `…/index.html`, Lehrerbereich unter `…/admin.html`.

Ohne eingetragene URL läuft der Test im **Demo-Modus**: Ergebnisse bleiben im Browser des Geräts, der Lehrerbereich nimmt dort jedes Passwort an. Das ist nur zum Ausprobieren gedacht.

Das Startpasswort steht als Hash in `js/config.js`. Ein anderes Passwort erzeugt man mit `node -e "console.log(require('./js/aufgaben.js').hash('gnw-kz:NeuesPasswort'))"` und trägt es bei `START_HASH` ein.

## Grenzen

- Das Startpasswort wird im Browser geprüft. Es hält Neugierige im Unterricht ab, ist aber kein Schutz gegen jemanden, der den Quelltext liest. Das gilt auch für die Sollwerte, die im Browser berechnet werden, damit „Richtig“ sofort erscheint.
- Wer unter einem anderen Vornamen oder von einem anderen Gerät neu beginnt, bekommt neue Aufgaben. Doppelte Teilnahmen erkennt man im Lehrerbereich an den Namen.
- Datenschutz: Gespeichert werden nur Vorname, Gerätekennung und Eingaben. Bitte vor dem Einsatz klären, ob die Schule Google-Tabellen dafür erlaubt.

## Prüfen nach Änderungen

```
node tools/dump.js 3 > /dev/null    # Aufgabengenerator läuft
python tools/nachrechnen.py         # Zweitrechnung aller Sollwerte mit sympy (500 Startwerte)
```
