# GIS-PWA-Test

Wegwerf-Repo zum Ticket „Google-Freigabe in der installierten PWA auf dem Gerät prüfen“ aus [FelixSab/time-tracker-app](https://github.com/FelixSab/time-tracker-app). Es klärt, ob eine reine Browser-App ohne Backend in einer auf Android installierten PWA über das Tokenmodell von Google Identity Services ein Drive-Token bekommt. Nach dem Test wird das Repo gelöscht.

Seite: <https://felixsab.github.io/gis-pwa-test/>

Die Seite speichert Client-ID, Google-Konto und ein Protokoll nur im Browser des Geräts. Das Protokoll übersteht App-Neustarts und lässt sich mit „Protokoll kopieren“ als JSON in die Zwischenablage kopieren.

## Teil 1: Google Cloud (am Rechner, einmalig)

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein neues Projekt anlegen, etwa `zeiterfassung`. Es wird später auch für `zeit.implet.io` verwendet.
2. **APIs und Dienste → Bibliothek:** „Google Drive API“ aktivieren.
3. **Google Auth Platform → Branding / Zielgruppe:** Nutzertyp „Extern“, App-Name „Zeiterfassung“, Support- und Entwickler-E-Mail eintragen.
4. **Datenzugriff:** den Scope `https://www.googleapis.com/auth/drive.appdata` hinzufügen.
5. **Zielgruppe:** Veröffentlichungsstatus auf **„Test“** lassen und unter **Testnutzer** das eigene Google-Konto hinzufügen. (Ergebnis vom 13.10.2026: „In Produktion“ verlangt App-Name, Support-E-Mail sowie URLs für Startseite und Datenschutzerklärung; für diesen Test ist das nicht nötig. Beim Anmelden erscheint „Google hat diese App nicht überprüft“, dort auf „Weiter“ tippen.)
6. **Clients → Client erstellen:** Typ „Webanwendung“, autorisierter JavaScript-Ursprung `https://felixsab.github.io`. Weiterleitungs-URIs leer lassen. Die **Client-ID** kopieren (kein Secret nötig).

## Teil 2: Handy (Android, Chrome)

Nach jedem Schritt steht das Ergebnis im Protokoll der Seite. Was auf dem Bildschirm passiert, bitte kurz mitschreiben.

1. Die Seite in Chrome öffnen. Client-ID und dein Google-Konto eintragen, **Speichern**.
2. Im normalen Browser-Tab: **1. Freigabe anfordern**, Konto wählen und zustimmen. Dann **Testdatei hochladen** und **Dateien auflisten**. Erwartet: „Token erhalten“, Upload HTTP 200.
3. Chrome-Menü → **App installieren** (oder „Zum Startbildschirm hinzufügen“). Notieren: Hieß der Eintrag „Installieren“ (echte App) oder nur „Verknüpfung“?
4. Die App **vom Startbildschirm** öffnen. Im Protokoll steht `[standalone]`. **1. Freigabe anfordern**: Öffnet sich ein Fenster (Custom Tab)? Kommst du nach der Anmeldung automatisch in die App zurück? Steht „Token erhalten“ im Protokoll?
5. **2. Erneut anfordern (ohne Dialog):** Was siehst du? Nur ein kurzes Aufblitzen, eine Kontoauswahl oder gar nichts? Kommt ein Token?
6. **3. In 10 Sekunden anfordern** und dann nichts antippen. Erwartet: „Freigabe fehlgeschlagen“ mit `popup_failed_to_open`.
7. Bei einer Anforderung das Anmeldefenster mit der **Zurück-Taste** schließen. Was steht im Protokoll?
8. In den Einstellungen **„Beim Start ohne Tipp anfordern“** einschalten und speichern. Die App aus den zuletzt genutzten Apps wegwischen und neu starten. Was passiert?
9. **Flugmodus an** und die App neu starten: Startet sie? Steht „GIS-Skript konnte nicht geladen werden“ im Protokoll? Danach Flugmodus wieder aus.
10. Nach **mehr als einer Stunde** ohne neue Freigabe: **Testdatei hochladen**. Erwartet: HTTP 401, weil das Token abgelaufen ist.
11. Im Protokoll stehen „Speicher dauerhaft?“ vor und nach der Installation. Falls `false`: **persist() anfordern** und das Ergebnis notieren.
12. **Protokoll kopieren** und zusammen mit deinen Notizen, Handymodell, Android-Version und Chrome-Version (Chrome → Einstellungen → Über Chrome) zurückmelden.

## Aufräumen

Nach dem Test: Repo löschen und unter <https://myaccount.google.com/permissions> die Freigabe für „Zeiterfassung“ entfernen, falls gewünscht. Das Google-Cloud-Projekt bleibt für die echte App bestehen; dort kommt später `https://zeit.implet.io` als JavaScript-Ursprung dazu.
