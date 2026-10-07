# Solid Pod Browser

Een kleine React-app om in te loggen op je Solid Pod via Solid-OIDC en de
inhoud van je pod te beheren: bestanden bladeren, en losse maintenance-
pagina's voor `schema:Person`, `schema:Place`, `schema:Event`,
`schema:Schedule`, `schema:ImageGallery`, `schema:ImageObject`,
`schema:ImageObjectSnapshot`, `schema:Organization`,
`schema:OrganizationRole`, `schema:EmployeeRole`, `schema:School` en
`schema:Certification`.

## Starten

```
npm install
npm run dev
```

Open daarna de getoonde localhost-url. Log in met de Identity Provider van
je pod (bijv. `https://login.inrupt.com`, `https://solidcommunity.net`, of
je eigen provider-url).

## Regressietest (Playwright)

```
npm run test:e2e
```

Draait `tests/regression.spec.js` tegen een al lopende app (`npm run dev`
op `http://localhost:5173`) en lokale testpod (`../css-server`, zie
daar z'n eigen README; standaard `http://localhost:3000/` met het
seed-account `test@example.org` / `test1234`). De test:

1. Maakt een Afbeelding aan met caption `testprofielfoto` en checkt of
   deze in de Afbeeldingen-lijst verschijnt.
2. Maakt een Persoon aan (Test / vd Test / test@test.org / 01324) met
   `testprofielfoto` als profielfoto, en checkt of deze in de
   Personen-lijst verschijnt.

Een `afterAll`-hook ruimt beide weer op (ook bij een voortijdig gestopte
run blijft er geen rommel achter - draai de test gewoon nog eens, de
cleanup verwijdert álle entries die matchen, niet alleen de laatst
aangemaakte). `tests/login.js` bevat de gedeelde Solid-OIDC login-flow
voor de testen.

**Draait de app of de testpod nog niet?** `tests/login.js` checkt dat
vooraf (een `fetch` naar beide) en faalt direct met een duidelijke
melding welke van de twee niet bereikbaar is, in plaats van na 30s met
een cryptische timeout diep in de OIDC-flow.

## Waarom opslaan nooit stil kan blijven hangen

`fetch()` heeft standaard geen timeout. Als een request (bv. een grote
afbeelding wegschrijven) om wat voor reden dan ook nooit een antwoord
krijgt, bleef "Opslaan"/"Annuleren" voor altijd uitgeschakeld zonder
foutmelding - de promise van die save settelde simpelweg nooit.
`src/solid.js`'s `authFetch` geeft daarom elk request een `AbortSignal`
van 60s mee: loopt een request langer, dan faalt 'ie met een gewone,
zichtbare fout in plaats van oneindig te hangen. `src/imageAssets.js`'s
`readImageDimensions` (afmetingen uit een bestand lezen vóór upload)
heeft om dezelfde reden een losse 10s-fallback.

### Afbeelding slepen (drag-and-drop) i.p.v. via de bestandsdialoog kiezen

Een `File` die je via drag-and-drop op het file-input laat vallen, bleek
soms te verlopen als je 'm pas ná het droppen leest (bv. omdat je eerst
nog een caption intypt en dán op "Opslaan" klikt) - de upload-fetch hing
dan voor altijd vast zonder ooit een fout te geven (totdat de hierboven
genoemde 60s-timeout 'm alsnog afkapte). Via de bestandsdialoog gekozen
bleef precies hetzelfde bestand wel altijd werken. `src/freezeFile.js`
leest het bestand daarom **direct bij selectie/drop** volledig in een
eigen in-memory kopie, in plaats van de losse `File`-referentie pas bij
"Opslaan" te gebruiken - zo is de upload nooit meer afhankelijk van hoe
lang de originele browser-handle naar het gesleepte bestand geldig blijft.
Gebruikt in `src/ImageAssetForm.jsx` en `src/ProfilePhoto.jsx`.

## Profielfoto

Naast "Uitloggen" staat een ronde knop met je profielfoto (of een "?" als
je nog geen foto hebt ingesteld). Klik erop om een bestaande Afbeelding te
kiezen of een nieuwe te uploaden; dit zet `schema:image` rechtstreeks op
je WebID-profieldocument (`src/profile.js`), niet op een losse
Person-resource. Zie `src/ProfilePhoto.jsx`.

### Waarom afbeeldingen via `AuthImage` gaan

Een gewone `<img src="...">` stuurt geen Solid-OIDC bearer-token mee, dus
die krijgt een 401 op elke niet-publieke pod-resource (en Chrome blokkeert
het foutantwoord dan via ORB in plaats van een gebroken plaatje te tonen).
Daarom gaat elke afbeelding die uit de pod komt (thumbnails, previews, de
profielfoto) door `src/AuthImage.jsx`: die haalt de bytes op met de
geauthenticeerde `authFetch` en toont ze als `blob:`-URL. Een lokaal net
gekozen bestand (al een `blob:`/`data:`-URL) wordt gewoon direct getoond,
zonder extra fetch.

## Waarom nieuwe/gewijzigde objecten altijd direct in de lijst staan

Een nieuw aangemaakt object verscheen soms pas in de lijst na een
server-restart: de browser hergebruikte een gecachte HTTP-respons voor de
container-listing in plaats van 'm na een create/update/delete opnieuw op
te halen. `src/solid.js` exporteert daarom `authFetch` i.p.v. het kale
`session.fetch` van `@inrupt/solid-client-authn-browser` — een dunne
wrapper die elk request met `cache: 'no-store'` doet, zodat de browser
nooit een stale lijst serveert. Alle datamodules en managers gebruiken
deze wrapper (nergens meer een los `session.fetch`).

## Waarom bewerken van Galerijen/Locaties/Events/... niet meer 412 geeft

Elk type dat een resource "in één keer volledig herbouwt" bij opslaan
(Place, Event, Schedule, Gallery, Organization, OrganizationRole,
EmployeeRole, School, Certification, ImageObject/Snapshot) gaf bij
**bewerken** van een bestaand object een `412 Precondition Failed`. Oorzaak:
`saveSolidDatasetAt` stuurt automatisch `If-None-Match: *` ("maak alleen
aan als dit nog niet bestaat") wanneer het meegegeven dataset geen
server-resource-info heeft — en dat is altijd zo bij een vers
`createSolidDataset()`. Bij een create klopt dat toevallig (de resource
bestaat nog niet), maar bij een update op een bestaande resource faalt de
precondition terecht. `src/saveDataset.js` exporteert daarom
`overwriteSolidDataset(url, dataset, fetchFn)`: die serialiseert het
dataset zelf naar Turtle en doet een onvoorwaardelijke PUT via
`overwriteFile` (die stuurt nooit conditionele headers), voor zowel create
als update. `src/people.js`, `src/typeIndex.js` en `src/profile.js` hadden
dit probleem niet - die patchen een eerder *opgehaald* dataset, waardoor
solid-client ze al correct als update herkent.

## Tabs

- **Bestanden** — generieke pod-browser: mappen in/uit lopen, nieuwe mappen
  aanmaken, bestanden/mappen verwijderen.
- **Personen (schema:Person)** — CRUD voor personen: voornaam, achternaam,
  volledige naam, e-mail, telefoon, geboortedatum, en een profielfoto
  (`schema:image`) gekozen uit je Afbeeldingen.
- **Locaties (schema:Place)** — CRUD voor locaties: naam, beschrijving,
  adres (straat, postcode, plaats, land) en coördinaten (latitude/longitude).
- **Events (schema:Event)** — CRUD voor events: naam, beschrijving,
  start/einde (datetime), en links naar een bestaande Locatie
  (`schema:location`) en/of Schedule (`schema:eventSchedule`).
- **Schedules (schema:Schedule)** — CRUD voor herhaalpatronen: periode
  (startDate/endDate), start-/eindtijd, herhalingsfrequentie
  (`repeatFrequency`, ISO 8601 zoals `P1W`), dagen van de week (`byDay`,
  schema.org's `DayOfWeek`-enum) en tijdzone.
- **Galerijen (schema:ImageGallery)** — CRUD voor galerijen: naam,
  beschrijving, en een selectie van Afbeeldingen (`schema:hasPart`).
- **Afbeeldingen (schema:ImageObject)** — upload een afbeelding naar de
  pod; caption, beschrijving, afmetingen en encoding format worden
  automatisch uit het bestand afgeleid.
- **Snapshots (schema:ImageObjectSnapshot)** — zelfde velden als
  Afbeeldingen, plus een link naar de bron-Afbeelding
  (`schema:exampleOfWork`) voor versiebeheer van hetzelfde beeld.
- **Organisaties (schema:Organization)** — naam, beschrijving, e-mail,
  telefoon, website (`schema:url`), WebID (`schema:identifier`), een link
  naar een bestaande Locatie (`schema:location`), een logo gekozen uit je
  Afbeeldingen (`schema:logo`), en een aanvinklijst van leden
  (`schema:member`) uit je Personen.
- **Rollen (schema:OrganizationRole)** — het n-ary "rol"-patroon: in
  plaats van Organization.member rechtstreeks naar een Persoon te laten
  wijzen, wijst het naar zo'n Role met functietitel (`roleName`), periode
  (startDate/endDate), volgnummer (`numberedPosition`), en links naar de
  Persoon (`schema:member`) en Organisatie (`schema:memberOf`).
- **Dienstverbanden (schema:EmployeeRole)** — zelfde rol-patroon,
  specifiek voor dienstverband: schema.org gebruikt hier `schema:employee`
  (i.p.v. `member`) en `schema:worksFor` (i.p.v. `memberOf`), plus
  `baseSalary` en `salaryCurrency`.
- **Scholen (schema:School)** — School voegt zelf geen eigenschappen toe
  aan Organization, dus deze tab heeft alle Organization-velden
  (naam, beschrijving, e-mail, telefoon, website, WebID, locatie, logo,
  member), plus `educationalLevel` (onderwijsniveau) en een aanvinklijst
  alumni (`schema:alumni`) uit je Personen. Elke School krijgt zowel
  `rdf:type schema:School` als `schema:Organization`, zodat generieke
  Organization-tooling 'm ook herkent.
- **Certificeringen (schema:Certification)** — naam, beschrijving,
  identificatie (`certificationIdentification`), status
  (`certificationStatus`, schema.org's `CertificationActive`/
  `CertificationInactive`-enum), vier datumvelden (`datePublished`,
  `validFrom`, `expires`, `auditDate`), een logo gekozen uit je
  Afbeeldingen, een uitgever (`schema:issuedBy`, naar een Organisatie), en
  `schema:about` (het gecertificeerde) dat naar een Organisatie, Persoon
  of Locatie kan wijzen.

## Hoe het werkt

- `src/solid.js` regelt inloggen/uitloggen via
  `@inrupt/solid-client-authn-browser`.
- `src/typeIndex.js` registreert bij het eerste gebruik een
  `solid:TypeRegistration` in je `solid:privateTypeIndex` (of
  `publicTypeIndex`) die vastlegt in welke container elk schema.org-type
  leeft: `schema:Person` → `people/`, `schema:Place` → `locations/`,
  `schema:Event` → `events/`, `schema:Schedule` → `schedules/`,
  `schema:ImageGallery` → `galleries/`, `schema:ImageObject` → `images/`,
  `schema:ImageObjectSnapshot` → `image-snapshots/`,
  `schema:Organization` → `organizations/`,
  `schema:OrganizationRole` → `organization-roles/`,
  `schema:EmployeeRole` → `employee-roles/`, `schema:School` → `schools/`,
  `schema:Certification` → `certifications/`. Dit is de standaard
  Solid-manier om "data-definities" in je pod te registreren.
- `src/people.js`, `src/places.js`, `src/events.js`, `src/schedules.js`,
  `src/galleries.js`, `src/organizations.js`, `src/organizationRoles.js`,
  `src/employeeRoles.js`, `src/schools.js`, `src/certifications.js` en
  `src/imageAssets.js` (gedeeld door ImageObject en ImageObjectSnapshot)
  doen de CRUD tegen die containers via `@inrupt/solid-client`. Elke
  resource is één Turtle-bestand waarvan de subject-URL gelijk is aan de
  resource-URL. Bij Place worden adres en geo-coördinaten als genest
  fragment (`#address`, `#geo`) in hetzelfde document opgeslagen. Event's
  `location`/`eventSchedule`, Snapshot's `exampleOfWork`, Gallery's
  `hasPart`, Organization/School's `location`/`logo`/`member`/`alumni`,
  Certification's `about`/`issuedBy`/`logo`, en de Role-types'
  `member`/`memberOf` resp. `employee`/`worksFor` zijn gewoon links naar
  andere resources elders in de pod. Een afbeelding is twee resources
  naast elkaar: het geüploade binaire bestand (`<slug>.<ext>`) en de
  metadata (`<slug>.ttl`), gekoppeld via `schema:contentUrl`.
- `src/PodBrowser.jsx`, `src/PeopleManager.jsx`, `src/LocationsManager.jsx`,
  `src/EventsManager.jsx`, `src/SchedulesManager.jsx`,
  `src/GalleriesManager.jsx`, `src/OrganizationsManager.jsx`,
  `src/OrganizationRolesManager.jsx`, `src/EmployeeRolesManager.jsx`,
  `src/SchoolsManager.jsx`, `src/CertificationsManager.jsx` en
  `src/ImageAssetsManager.jsx` (gedeeld door de Afbeeldingen- en
  Snapshots-tab) zijn de bijbehorende UI's; `src/PersonForm.jsx`,
  `src/LocationForm.jsx`, `src/EventForm.jsx`, `src/ScheduleForm.jsx`,
  `src/GalleryForm.jsx`, `src/OrganizationForm.jsx`,
  `src/OrganizationRoleForm.jsx`, `src/EmployeeRoleForm.jsx`,
  `src/SchoolForm.jsx`, `src/CertificationForm.jsx` en
  `src/ImageAssetForm.jsx` de formulieren.

## Let op: Windows-padlengte

Dit project installeert niet goed als het pad naar de map erg lang is
(Windows' klassieke 260-tekens limiet) — een van de dependencies
(`esbuild`) zet dan zijn `.exe` niet goed neer. Zet het project in een
map met een kort pad (bijv. `C:\dev\solid-pod-browser`) als `npm install`
faalt met een `ENOENT ... esbuild.exe` fout.
"# solid-pod-browser" 
