![Logo](../../admin/opnsense.png)

# ioBroker.opnsense — Dokumentation

Ueberwache deine [OPNsense](https://opnsense.org) Firewall mit ioBroker. Dieser Adapter nutzt die OPNsense REST API, um Gateway-Status, Interface-Traffic-Geschwindigkeit, Service-Zustaende, Firmware-Informationen und die ARP-Tabelle auszulesen.

> **Markenhinweis:** [OPNsense](https://opnsense.org) ist eine eingetragene Marke der [Deciso B.V.](https://www.deciso.com/). Das OPNsense-Logo wird gemaess den [OPNsense Legal Guidelines](https://opnsense.org/legal-guidelines/) verwendet, um diesen Adapter als Werkzeug fuer die OPNsense-Integration zu kennzeichnen. Dieses Projekt ist nicht mit Deciso B.V. oder dem OPNsense-Projekt verbunden und wird nicht von diesen unterstuetzt.

## Inhaltsverzeichnis

- [OPNsense einrichten](#opnsense-einrichten)
  - [API-Benutzer anlegen](#1-api-benutzer-anlegen)
  - [Gruppe mit Berechtigungen erstellen](#2-gruppe-mit-berechtigungen-erstellen)
  - [Benutzer der Gruppe zuweisen](#3-benutzer-der-gruppe-zuweisen)
  - [API-Schluessel generieren](#4-api-schluessel-generieren)
- [Adapter-Konfiguration](#adapter-konfiguration)
- [States-Referenz](#states-referenz)
- [Fehlerbehebung](#fehlerbehebung)
- [FAQ](#faq)

---

## OPNsense einrichten

Der Adapter benoetigt einen API-Benutzer mit bestimmten Berechtigungen, um Daten von der OPNsense Firewall zu lesen. Folge diesen Schritten sorgfaeltig.

### 1. API-Benutzer anlegen

1. Melde dich an der OPNsense Weboberflaeche an
2. Navigiere zu **System > Zugang > Benutzer**
3. Klicke auf **Hinzufuegen** (+-Button)
4. Fuelle aus:
   - **Benutzername**: `iobroker_api` (oder ein beliebiger Name)
   - **Passwort**: Setze ein starkes Passwort (wird nicht fuer den API-Zugang verwendet, ist aber erforderlich)
   - **Login-Shell**: `/sbin/nologin`
   - **Voller Name**: `ioBroker API-Zugang`
5. Klicke auf **Speichern**

### 2. Gruppe mit Berechtigungen erstellen

1. Navigiere zu **System > Zugang > Gruppen**
2. Klicke auf **Hinzufuegen** (+-Button)
3. **Gruppenname**: `iobroker_readonly`
4. **Beschreibung**: `Nur-Lese API-Zugang fuer ioBroker`
5. Klicke auf **Speichern**
6. Klicke auf den **Bearbeiten**-Button (Stift-Symbol) bei der neu erstellten Gruppe
7. Im Abschnitt **Zugewiesene Berechtigungen** klicke auf **Bearbeiten**
8. Fuege folgende Berechtigungen hinzu:

| Berechtigung | Benoetigt fuer |
|-------------|----------------|
| **System: Gateways** | Gateway-Status (Online/Offline, Verzoegerung, Paketverlust) |
| **Reporting: Traffic** | Interface-Traffic-Daten |
| **System: Firmware** | Firmware-Version und Update-Status |
| **Status: Services** | Dienst-Zustaende |
| **Status: Interfaces** | Interface-Informationen |
| **Diagnostics: Netstat** | Interface-Statistiken (Pakete, Fehler) |
| **Diagnostics: ARP Table** | ARP-Tabelle (IP, MAC, Hostname) |

9. Klicke auf **Speichern**

### 3. Benutzer der Gruppe zuweisen

1. Navigiere zu **System > Zugang > Benutzer**
2. Klicke auf **Bearbeiten** beim Benutzer `iobroker_api`
3. Im Abschnitt **Gruppenmitgliedschaften** fuege den Benutzer zur Gruppe `iobroker_readonly` hinzu
4. Klicke auf **Speichern**

### 4. API-Schluessel generieren

1. Navigiere zu **System > Zugang > Benutzer**
2. Klicke auf **Bearbeiten** beim Benutzer `iobroker_api`
3. Scrolle zum Abschnitt **API-Schluessel**
4. Klicke auf den **+** (Hinzufuegen)-Button
5. Eine Datei wird automatisch heruntergeladen mit:
   - **key**: Dein API-Schluessel
   - **secret**: Dein API-Geheimnis

> **Wichtig:** Das API-Geheimnis wird nur einmal beim Download angezeigt! Wenn du es verlierst, musst du ein neues Schluesselpaar generieren.

Die heruntergeladene Datei sieht so aus:
```ini
key=dein-api-schluessel
secret=dein-api-geheimnis
```

---

## Adapter-Konfiguration

| Einstellung | Beschreibung | Standard |
|-------------|-------------|----------|
| **Host** | IP-Adresse oder Hostname der OPNsense Firewall | — |
| **Port** | HTTPS-Port | `443` |
| **API-Schluessel** | API Key aus der heruntergeladenen Datei | — |
| **API-Geheimnis** | API Secret aus der heruntergeladenen Datei (wird verschluesselt gespeichert) | — |
| **Abfrageintervall** | Wie oft OPNsense abgefragt wird, in Sekunden (Minimum: 10) | `30` |
| **Anfrage-Timeout** | Zeitlimit fuer einzelne API-Anfragen, in Sekunden | `10` |
| **SSL-Zertifikat pruefen** | SSL-Zertifikat von OPNsense ueberpruefen. Bei selbstsignierten Zertifikaten deaktivieren. | `true` |

---

## States-Referenz

### info

| State | Typ | Beschreibung |
|-------|-----|-------------|
| `info.connection` | boolean | `true` wenn mit OPNsense verbunden |
| `info.lastUpdate` | number | Zeitstempel der letzten erfolgreichen Abfrage |

### system

| State | Typ | Einheit | Beschreibung |
|-------|-----|---------|-------------|
| `system.firmwareVersion` | string | | Aktuelle Firmware-Version |
| `system.productName` | string | | Produktname (z.B. "OPNsense") |
| `system.productArch` | string | | Systemarchitektur |
| `system.updateAvailable` | boolean | | `true` wenn Firmware-Update verfuegbar |
| `system.updateCount` | number | | Anzahl verfuegbarer Updates |
| `system.needsReboot` | boolean | | `true` wenn System einen Neustart benoetigt |

### gateways.\<name\>

Ein Channel pro konfiguriertem Gateway.

| State | Typ | Einheit | Beschreibung |
|-------|-----|---------|-------------|
| `gateways.<name>.address` | string | | Gateway IP-Adresse |
| `gateways.<name>.status` | string | | Statustext |
| `gateways.<name>.online` | boolean | | `true` wenn Gateway online |
| `gateways.<name>.loss` | number | % | Paketverlust in Prozent |
| `gateways.<name>.delay` | number | ms | Round-Trip-Verzoegerung |
| `gateways.<name>.stddev` | number | ms | Standardabweichung der Verzoegerung |

### interfaces.\<name\>

Ein Channel pro Netzwerk-Interface.

| State | Typ | Einheit | Beschreibung |
|-------|-----|---------|-------------|
| `interfaces.<name>.status` | string | | Interface-Status |
| `interfaces.<name>.enabled` | boolean | | Interface aktiviert |
| `interfaces.<name>.macAddress` | string | | MAC-Adresse |
| `interfaces.<name>.mtu` | number | | Maximum Transmission Unit |

#### interfaces.\<name\>.traffic

| State | Typ | Einheit | Beschreibung |
|-------|-----|---------|-------------|
| `...traffic.bytesReceivedSpeed` | number | B/s | Aktuelle Empfangsgeschwindigkeit in Bytes/s |
| `...traffic.bytesTransmittedSpeed` | number | B/s | Aktuelle Sendegeschwindigkeit in Bytes/s |
| `...traffic.bitsReceivedSpeed` | number | bit/s | Aktuelle Empfangsgeschwindigkeit in Bits/s |
| `...traffic.bitsTransmittedSpeed` | number | bit/s | Aktuelle Sendegeschwindigkeit in Bits/s |

> **Hinweis:** Die Traffic-Geschwindigkeit wird als Differenz zwischen zwei aufeinanderfolgenden Abfragen berechnet. Nach dem Adapterstart erscheinen die ersten Geschwindigkeitswerte erst nach dem zweiten Abfragezyklus.

#### interfaces.\<name\>.statistics

| State | Typ | Beschreibung |
|-------|-----|-------------|
| `...statistics.packetsIn` | number | Gesamtzahl empfangener Pakete |
| `...statistics.packetsOut` | number | Gesamtzahl gesendeter Pakete |
| `...statistics.errorsIn` | number | Gesamtzahl Eingabefehler |
| `...statistics.errorsOut` | number | Gesamtzahl Ausgabefehler |

### services.\<name\>

Ein Channel pro Dienst.

| State | Typ | Beschreibung |
|-------|-----|-------------|
| `services.<name>.running` | boolean | `true` wenn Dienst laeuft |
| `services.<name>.description` | string | Dienstbeschreibung |

### arp.\<ip\>

Ein Channel pro ARP-Tabelleneintrag.

| State | Typ | Beschreibung |
|-------|-----|-------------|
| `arp.<ip>.ip` | string | IP-Adresse |
| `arp.<ip>.mac` | string | MAC-Adresse |
| `arp.<ip>.interface` | string | Netzwerk-Interface |
| `arp.<ip>.hostname` | string | Hostname (falls bekannt) |
| `arp.<ip>.manufacturer` | string | Geraetehersteller (aus MAC) |

---

## Fehlerbehebung

### "SSL certificate error" / "self-signed certificate"
Deine OPNsense verwendet ein selbstsigniertes SSL-Zertifikat. Deaktiviere **SSL-Zertifikat pruefen** in den Adaptereinstellungen.

### "HTTP 401" / "Unauthorized"
- Pruefe ob API-Schluessel und API-Geheimnis korrekt sind
- Stelle sicher, dass der API-Benutzer die noetigten Berechtigungen hat (siehe [OPNsense einrichten](#opnsense-einrichten))
- Pruefe ob der API-Schluessel nicht widerrufen wurde

### "HTTP 403" / "Forbidden"
Dem API-Benutzer fehlen Berechtigungen fuer bestimmte Endpunkte. Pruefe ob alle 7 Berechtigungen aus der Einrichtungsanleitung zugewiesen sind.

### "ECONNREFUSED" / "ETIMEDOUT"
- Pruefe ob Host und Port der OPNsense korrekt sind
- Pruefe die Netzwerkverbindung zwischen ioBroker und OPNsense
- Pruefe ob die OPNsense-Weboberflaeche erreichbar ist

### Traffic-Geschwindigkeit zeigt 0
Die Traffic-Geschwindigkeit wird aus der Differenz zweier Abfragen berechnet. Nach dem Adapterstart erscheinen die ersten Werte erst nach dem zweiten Abfragezyklus.

---

## FAQ

**F: Wie oft sollte ich abfragen?**
A: Der Standard von 30 Sekunden ist eine gute Balance. Fuer Echtzeit-Traffic-Ueberwachung kannst du auf 10 Sekunden reduzieren. Sehr haeufige Abfragen (< 15s) koennen die CPU-Last der OPNsense leicht erhoehen.

**F: Kann ich Dienste (Start/Stop) von ioBroker aus steuern?**
A: Noch nicht. Dies ist fuer ein zukuenftiges Release geplant.

**F: Funktioniert der Adapter mit pfSense?**
A: Nein. pfSense verwendet eine andere API. Dieser Adapter ist speziell fuer OPNsense entwickelt.
