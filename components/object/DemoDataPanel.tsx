"use client"

import * as React from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"

// ------------------------
// Datentyp für das Formular
// ------------------------

type FormData = {
  // Allgemein
  objektBezeichnung: string
  objektTyp: string
  adresseStrasse: string
  adressePlzOrt: string
  baujahr: string
  letzteSanierung: string
  aktuellerNutzungsstatus: string // "Eigennutzung", "Vermietet", etc.
  leerstandSeit: string
  ansprechpartnerEigentuemer: string
  energieklasse: string
  energieKennwert: string
  sofortBezugsfreiAb: string
  kaufpreisVorstellung: string
  kurzbeschreibungZustand: string

  // Flächen & Räume
  grundstuecksFlaecheQm: string
  wohnflaecheQm: string
  nutzflaecheKellerQm: string
  anzahlZimmer: string
  anzahlBadezimmer: string
  anzahlSchlafzimmer: string
  anzahlEtagen: string
  stellplaetzeAnzahl: string
  stellplatzArt: string // Garage / Carport / Außenstellplatz
  balkonTerrasse: string // "Balkon", "Terrasse", "Balkon+Terrasse", "Keine"
  gartenVorhanden: string // "ja/nein"

  // Technischer Zustand / Gebäudehülle
  dachZustand: string
  dachErneuertJahr: string
  fensterZustand: string
  fensterTyp: string // "2-fach", "3-fach", ...
  waermedaemmungVorhanden: string // "ja/nein/teilweise"
  heizungTyp: string // "Gas", "Öl", "Fernwärme", "Wärmepumpe", etc.
  heizungBaujahr: string
  heizungLetzteWartung: string
  warmwasserErzeugung: string // "über Heizung", "Boiler", etc.
  elektrikStand: string // "Alt", "Teilmodernisiert", "Aktuell"
  wasserLeitungenStand: string
  abwasserLeitungenStand: string
  feuchtigkeitKeller: string // "Keine", "Leichte Feuchte", ...
  schimmelSichtbar: string // "ja/nein"
  besondereMaengel: string // Freitext

  // Dokumente / Rechtliches
  energieausweisVorhanden: string // "ja/nein"
  energieausweisGueltigBis: string
  grundbuchauszugVorhanden: string // "ja/nein"
  teilungserklaerungVorhanden: string // "ja/nein/nicht relevant"
  wegProtokolleVorhanden: string // "ja/nein/nicht relevant"
  kaminkehrerPruefungDatum: string
  heizungsWartungsvertrag: string // "ja/nein"
  baulastenauskunftVorhanden: string // "ja/nein"
  denkmalschutz: string // "ja/nein/teilweise"

  // Umgebung / Lage
  lageBeschreibungKurz: string
  laermEinschaetzung: string // "ruhig", "leichter Straßenlärm", ...
  oepnvAnbindung: string // "U-Bahn 6 Min zu Fuß", ...
  schulenKitasInNaehe: string
  einkaufZuFuss: string // "Supermarkt & Bäcker <5 Min", ...

  // Mehrfach-Auswahl Felder (Checkbox-Gruppen)
  ausstattungHighlights: string[]    // z.B. "Einbauküche", "Fußbodenheizung", ...
  modernisierungsBedarf: string[]    // z.B. "Fenster tauschen", "Bad sanieren", ...
  rechtlicheBesonderheiten: string[] // z.B. "Erbbaurecht", ...
}

// ------------------------
// Initiale Demo-Daten
// ------------------------

const initialData: FormData = {
  objektBezeichnung: "Einfamilienhaus Musterstraße 12",
  objektTyp: "Einfamilienhaus, freistehend",
  adresseStrasse: "Musterstraße 12",
  adressePlzOrt: "80333 München",
  baujahr: "1998",
  letzteSanierung: "2021 (Bäder, Heizung)",
  aktuellerNutzungsstatus: "Eigennutzung",
  leerstandSeit: "–",
  ansprechpartnerEigentuemer: "Max Mustermann, 0171 / 1234567",
  energieklasse: "B",
  energieKennwert: "73 kWh/m²a",
  sofortBezugsfreiAb: "01.12.2025",
  kaufpreisVorstellung: "1.250.000 €",
  kurzbeschreibungZustand:
    "Sehr gepflegt, modernisierte Bäder, Keller leicht feucht im hinteren Bereich.",

  grundstuecksFlaecheQm: "410",
  wohnflaecheQm: "162",
  nutzflaecheKellerQm: "68",
  anzahlZimmer: "6",
  anzahlBadezimmer: "2",
  anzahlSchlafzimmer: "3",
  anzahlEtagen: "2 + Keller",
  stellplaetzeAnzahl: "2",
  stellplatzArt: "Doppelgarage",
  balkonTerrasse: "Terrasse Süd",
  gartenVorhanden: "Ja, Süd-Garten ca. 180 m²",

  dachZustand: "gut, keine sichtbaren Schäden",
  dachErneuertJahr: "Original 1998, Dachziegel gereinigt 2022",
  fensterZustand: "teilmodernisiert",
  fensterTyp: "Kunststoff, 2-fach verglast (2010 teilw. getauscht)",
  waermedaemmungVorhanden: "teilweise",
  heizungTyp: "Gas-Brennwert",
  heizungBaujahr: "2021",
  heizungLetzteWartung: "06/2025",
  warmwasserErzeugung: "über Heizung",
  elektrikStand: "teilmodernisiert",
  wasserLeitungenStand: "Kupfer, kein offensichtlicher Mangel",
  abwasserLeitungenStand: "PVC, frei",
  feuchtigkeitKeller: "Leichte Feuchte an Außenwand hinten links",
  schimmelSichtbar: "Nein",
  besondereMaengel:
    "Leichte Rissbildung im Putz an Südseite Terrasse.",

  energieausweisVorhanden: "Ja",
  energieausweisGueltigBis: "08/2033",
  grundbuchauszugVorhanden: "Ja (Stand 10/2025)",
  teilungserklaerungVorhanden: "nicht relevant (EFH)",
  wegProtokolleVorhanden: "nicht relevant (EFH)",
  kaminkehrerPruefungDatum: "12/2024",
  heizungsWartungsvertrag: "Ja, lokaler Installateur",
  baulastenauskunftVorhanden: "Ja, keine Einträge lt. Eigentümer",
  denkmalschutz: "Nein",

  lageBeschreibungKurz:
    "Ruhige Seitenstraße in der Maxvorstadt, kaum Durchgangsverkehr.",
  laermEinschaetzung: "ruhig",
  oepnvAnbindung: "U-Bahn 6 Min zu Fuß, Bus 2 Min",
  schulenKitasInNaehe: "Kita 300 m, Grundschule 700 m",
  einkaufZuFuss: "Supermarkt & Bäcker <5 Min Fußweg",

  ausstattungHighlights: [
    "Fußbodenheizung EG",
    "Einbauküche (2021)",
    "Elektrisches Garagentor",
    "Terrasse Süd",
  ],
  modernisierungsBedarf: [
    "Keller abdichten/hinterlüften",
    "Teilweise Fenster tauschen",
  ],
  rechtlicheBesonderheiten: ["Keine bekannten Rechte Dritter"],
}

// ------------------------
// Optionen für Checkbox-Gruppen
// ------------------------

const AUSSTATTUNG_OPTIONS = [
  "Fußbodenheizung EG",
  "Einbauküche (2021)",
  "Elektrisches Garagentor",
  "Kaminanschluss im Wohnzimmer",
  "Terrasse Süd",
  "Smart-Home-Grundausstattung",
]

const MODERNISIERUNG_OPTIONS = [
  "Fenster tauschen",
  "Bad sanieren",
  "Dach dämmen",
  "Keller abdichten",
  "Elektrik prüfen lassen",
]

const RECHTLICH_OPTIONS = [
  "Nießbrauchrecht",
  "Wohnrecht Dritter",
  "Erbbaurecht",
  "Vorkaufsrecht Gemeinde",
  "Keine bekannten Rechte Dritter",
]

// ------------------------
// Haupt-Panel
// ------------------------

export function DemoDataPanel() {
  const [isEditing, setIsEditing] = React.useState(false)
  const [formData, setFormData] = React.useState<FormData>(initialData)

  function handleChange<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function toggleArrayValue<K extends keyof FormData>(key: K, option: string) {
    setFormData((prev) => {
      const current = prev[key]
      if (!Array.isArray(current)) return prev
      const exists = current.includes(option)
      const next = exists
        ? current.filter((x) => x !== option)
        : [...current, option]
      return { ...prev, [key]: next }
    })
  }

  function cancelEdit() {
    setFormData(initialData) // lokal Änderungen verwerfen
    setIsEditing(false)
  }

  function saveEdit() {
    console.log("Speichern (lokal):", formData)
    // später: DB / API
    setIsEditing(false)
  }

  return (
    <Card className="h-[80vh] flex flex-col">
      {/* Kopfbereich */}
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold leading-none">
            Demodaten Gebäudeaufnahme
          </div>
          <div className="text-sm text-muted-foreground">
            Stand 30.10.2025 · Objekt: Musterstraße 12
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Bearbeiten
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={saveEdit}>
                Speichern
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <Separator />

      {/* Inhalt mit Scroll */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-6 text-sm space-y-10">

          {/* Abschnitt: Allgemein */}
          <SectionBlock title="Allgemein" first>
            <TwoColGrid>
              <FieldRow
                label="Objektbezeichnung"
                editing={isEditing}
                value={formData.objektBezeichnung}
                onChange={(val) => handleChange("objektBezeichnung", val)}
              />
              <FieldRow
                label="Objekttyp"
                editing={isEditing}
                value={formData.objektTyp}
                onChange={(val) => handleChange("objektTyp", val)}
              />
              <FieldRow
                label="Adresse"
                editing={isEditing}
                value={formData.adresseStrasse}
                onChange={(val) => handleChange("adresseStrasse", val)}
              />
              <FieldRow
                label="PLZ / Ort"
                editing={isEditing}
                value={formData.adressePlzOrt}
                onChange={(val) => handleChange("adressePlzOrt", val)}
              />
              <FieldRow
                label="Baujahr"
                editing={isEditing}
                value={formData.baujahr}
                onChange={(val) => handleChange("baujahr", val)}
              />
              <FieldRow
                label="Letzte Sanierung"
                editing={isEditing}
                value={formData.letzteSanierung}
                onChange={(val) => handleChange("letzteSanierung", val)}
              />
              <FieldRow
                label="Nutzungsstatus"
                editing={isEditing}
                value={formData.aktuellerNutzungsstatus}
                onChange={(val) =>
                  handleChange("aktuellerNutzungsstatus", val)
                }
              />
              <FieldRow
                label="Leerstand seit"
                editing={isEditing}
                value={formData.leerstandSeit}
                onChange={(val) => handleChange("leerstandSeit", val)}
              />
              <FieldRow
                label="Eigentümer / Kontakt"
                editing={isEditing}
                value={formData.ansprechpartnerEigentuemer}
                onChange={(val) =>
                  handleChange("ansprechpartnerEigentuemer", val)
                }
              />
              <FieldRow
                label="Energieklasse"
                editing={isEditing}
                value={formData.energieklasse}
                onChange={(val) => handleChange("energieklasse", val)}
              />
              <FieldRow
                label="Energiekennwert"
                editing={isEditing}
                value={formData.energieKennwert}
                onChange={(val) => handleChange("energieKennwert", val)}
              />
              <FieldRow
                label="Bezugsfrei ab"
                editing={isEditing}
                value={formData.sofortBezugsfreiAb}
                onChange={(val) => handleChange("sofortBezugsfreiAb", val)}
              />
              <FieldRow
                label="Kaufpreisvorstellung"
                editing={isEditing}
                value={formData.kaufpreisVorstellung}
                onChange={(val) =>
                  handleChange("kaufpreisVorstellung", val)
                }
              />
              <FieldRow
                label="Zustand (Kurzbeschreibung)"
                editing={isEditing}
                value={formData.kurzbeschreibungZustand}
                textarea
                onChange={(val) =>
                  handleChange("kurzbeschreibungZustand", val)
                }
              />
            </TwoColGrid>
          </SectionBlock>

          {/* Abschnitt: Flächen & Räume */}
          <SectionBlock title="Flächen & Räume">
            <TwoColGrid>
              <FieldRow
                label="Grundstücksfläche (m²)"
                editing={isEditing}
                value={formData.grundstuecksFlaecheQm}
                onChange={(val) =>
                  handleChange("grundstuecksFlaecheQm", val)
                }
              />
              <FieldRow
                label="Wohnfläche (m²)"
                editing={isEditing}
                value={formData.wohnflaecheQm}
                onChange={(val) => handleChange("wohnflaecheQm", val)}
              />
              <FieldRow
                label="Nutzfläche Keller (m²)"
                editing={isEditing}
                value={formData.nutzflaecheKellerQm}
                onChange={(val) =>
                  handleChange("nutzflaecheKellerQm", val)
                }
              />
              <FieldRow
                label="Zimmer gesamt"
                editing={isEditing}
                value={formData.anzahlZimmer}
                onChange={(val) => handleChange("anzahlZimmer", val)}
              />
              <FieldRow
                label="Badezimmer"
                editing={isEditing}
                value={formData.anzahlBadezimmer}
                onChange={(val) =>
                  handleChange("anzahlBadezimmer", val)
                }
              />
              <FieldRow
                label="Schlafzimmer"
                editing={isEditing}
                value={formData.anzahlSchlafzimmer}
                onChange={(val) =>
                  handleChange("anzahlSchlafzimmer", val)
                }
              />
              <FieldRow
                label="Etagen"
                editing={isEditing}
                value={formData.anzahlEtagen}
                onChange={(val) => handleChange("anzahlEtagen", val)}
              />
              <FieldRow
                label="Stellplätze (Anzahl)"
                editing={isEditing}
                value={formData.stellplaetzeAnzahl}
                onChange={(val) =>
                  handleChange("stellplaetzeAnzahl", val)
                }
              />
              <FieldRow
                label="Stellplatzart"
                editing={isEditing}
                value={formData.stellplatzArt}
                onChange={(val) => handleChange("stellplatzArt", val)}
              />
              <FieldRow
                label="Balkon / Terrasse"
                editing={isEditing}
                value={formData.balkonTerrasse}
                onChange={(val) =>
                  handleChange("balkonTerrasse", val)
                }
              />
              <FieldRow
                label="Garten"
                editing={isEditing}
                value={formData.gartenVorhanden}
                onChange={(val) => handleChange("gartenVorhanden", val)}
              />
            </TwoColGrid>
          </SectionBlock>

          {/* Abschnitt: Technischer Zustand */}
          <SectionBlock title="Technischer Zustand">
            <TwoColGrid>
              <FieldRow
                label="Dach (Zustand)"
                editing={isEditing}
                value={formData.dachZustand}
                onChange={(val) => handleChange("dachZustand", val)}
              />
              <FieldRow
                label="Dach erneuert / Jahr"
                editing={isEditing}
                value={formData.dachErneuertJahr}
                onChange={(val) =>
                  handleChange("dachErneuertJahr", val)
                }
              />
              <FieldRow
                label="Fenster (Zustand)"
                editing={isEditing}
                value={formData.fensterZustand}
                onChange={(val) =>
                  handleChange("fensterZustand", val)
                }
              />
              <FieldRow
                label="Fenster (Typ)"
                editing={isEditing}
                value={formData.fensterTyp}
                onChange={(val) => handleChange("fensterTyp", val)}
              />
              <FieldRow
                label="Wärmedämmung"
                editing={isEditing}
                value={formData.waermedaemmungVorhanden}
                onChange={(val) =>
                  handleChange("waermedaemmungVorhanden", val)
                }
              />
              <FieldRow
                label="Heizung (Typ)"
                editing={isEditing}
                value={formData.heizungTyp}
                onChange={(val) => handleChange("heizungTyp", val)}
              />
              <FieldRow
                label="Heizung Baujahr"
                editing={isEditing}
                value={formData.heizungBaujahr}
                onChange={(val) => handleChange("heizungBaujahr", val)}
              />
              <FieldRow
                label="Heizung letzte Wartung"
                editing={isEditing}
                value={formData.heizungLetzteWartung}
                onChange={(val) =>
                  handleChange("heizungLetzteWartung", val)
                }
              />
              <FieldRow
                label="Warmwasser"
                editing={isEditing}
                value={formData.warmwasserErzeugung}
                onChange={(val) =>
                  handleChange("warmwasserErzeugung", val)
                }
              />
              <FieldRow
                label="Elektrik Stand"
                editing={isEditing}
                value={formData.elektrikStand}
                onChange={(val) => handleChange("elektrikStand", val)}
              />
              <FieldRow
                label="Wasserleitungen"
                editing={isEditing}
                value={formData.wasserLeitungenStand}
                onChange={(val) =>
                  handleChange("wasserLeitungenStand", val)
                }
              />
              <FieldRow
                label="Abwasserleitungen"
                editing={isEditing}
                value={formData.abwasserLeitungenStand}
                onChange={(val) =>
                  handleChange("abwasserLeitungenStand", val)
                }
              />
              <FieldRow
                label="Feuchtigkeit Keller"
                editing={isEditing}
                value={formData.feuchtigkeitKeller}
                onChange={(val) =>
                  handleChange("feuchtigkeitKeller", val)
                }
              />
              <FieldRow
                label="Schimmel sichtbar"
                editing={isEditing}
                value={formData.schimmelSichtbar}
                onChange={(val) =>
                  handleChange("schimmelSichtbar", val)
                }
              />
              <FieldRow
                label="Besondere Mängel"
                editing={isEditing}
                value={formData.besondereMaengel}
                textarea
                onChange={(val) =>
                  handleChange("besondereMaengel", val)
                }
              />
            </TwoColGrid>
          </SectionBlock>

          {/* Abschnitt: Dokumente & Rechtliches */}
          <SectionBlock title="Dokumente & Rechtliches">
            <TwoColGrid>
              <FieldRow
                label="Energieausweis vorhanden"
                editing={isEditing}
                value={formData.energieausweisVorhanden}
                onChange={(val) =>
                  handleChange("energieausweisVorhanden", val)
                }
              />
              <FieldRow
                label="Energieausweis gültig bis"
                editing={isEditing}
                value={formData.energieausweisGueltigBis}
                onChange={(val) =>
                  handleChange("energieausweisGueltigBis", val)
                }
              />
              <FieldRow
                label="Grundbuchauszug vorhanden"
                editing={isEditing}
                value={formData.grundbuchauszugVorhanden}
                onChange={(val) =>
                  handleChange("grundbuchauszugVorhanden", val)
                }
              />
              <FieldRow
                label="Teilungserklärung"
                editing={isEditing}
                value={formData.teilungserklaerungVorhanden}
                onChange={(val) =>
                  handleChange("teilungserklaerungVorhanden", val)
                }
              />
              <FieldRow
                label="WEG-Protokolle"
                editing={isEditing}
                value={formData.wegProtokolleVorhanden}
                onChange={(val) =>
                  handleChange("wegProtokolleVorhanden", val)
                }
              />
              <FieldRow
                label="Kaminkehrerprüfung"
                editing={isEditing}
                value={formData.kaminkehrerPruefungDatum}
                onChange={(val) =>
                  handleChange("kaminkehrerPruefungDatum", val)
                }
              />
              <FieldRow
                label="Heizungs-Wartungsvertrag"
                editing={isEditing}
                value={formData.heizungsWartungsvertrag}
                onChange={(val) =>
                  handleChange("heizungsWartungsvertrag", val)
                }
              />
              <FieldRow
                label="Baulastenauskunft"
                editing={isEditing}
                value={formData.baulastenauskunftVorhanden}
                onChange={(val) =>
                  handleChange("baulastenauskunftVorhanden", val)
                }
              />
              <FieldRow
                label="Denkmalschutz"
                editing={isEditing}
                value={formData.denkmalschutz}
                onChange={(val) => handleChange("denkmalschutz", val)}
              />
            </TwoColGrid>
          </SectionBlock>

          {/* Abschnitt: Umfeld & Lage */}
          <SectionBlock title="Umfeld & Lage">
            <TwoColGrid>
              <FieldRow
                label="Lage (kurz)"
                editing={isEditing}
                value={formData.lageBeschreibungKurz}
                textarea
                onChange={(val) =>
                  handleChange("lageBeschreibungKurz", val)
                }
              />
              <FieldRow
                label="Lärmeinschätzung"
                editing={isEditing}
                value={formData.laermEinschaetzung}
                onChange={(val) =>
                  handleChange("laermEinschaetzung", val)
                }
              />
              <FieldRow
                label="ÖPNV-Anbindung"
                editing={isEditing}
                value={formData.oepnvAnbindung}
                textarea
                onChange={(val) => handleChange("oepnvAnbindung", val)}
              />
              <FieldRow
                label="Schulen / Kitas"
                editing={isEditing}
                value={formData.schulenKitasInNaehe}
                textarea
                onChange={(val) =>
                  handleChange("schulenKitasInNaehe", val)
                }
              />
              <FieldRow
                label="Einkauf fußläufig"
                editing={isEditing}
                value={formData.einkaufZuFuss}
                textarea
                onChange={(val) => handleChange("einkaufZuFuss", val)}
              />
            </TwoColGrid>
          </SectionBlock>

          {/* Abschnitt: Ausstattung (Mehrfachauswahl) */}
          <SectionBlock title="Ausstattung (Mehrfachauswahl)">
            <MultiCheckGroup
              label="Ausstattung-Highlights"
              options={AUSSTATTUNG_OPTIONS}
              values={formData.ausstattungHighlights}
              editing={isEditing}
              onToggle={(option) =>
                toggleArrayValue("ausstattungHighlights", option)
              }
            />

            <MultiCheckGroup
              label="Modernisierungsbedarf"
              options={MODERNISIERUNG_OPTIONS}
              values={formData.modernisierungsBedarf}
              editing={isEditing}
              onToggle={(option) =>
                toggleArrayValue("modernisierungsBedarf", option)
              }
            />

            <MultiCheckGroup
              label="Rechtliche Besonderheiten"
              options={RECHTLICH_OPTIONS}
              values={formData.rechtlicheBesonderheiten}
              editing={isEditing}
              onToggle={(option) =>
                toggleArrayValue("rechtlicheBesonderheiten", option)
              }
            />
          </SectionBlock>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ------------------------
// Bausteine / kleine Hilfen
// ------------------------

function SectionBlock({
  title,
  children,
  first = false,
}: {
  title: string
  children: React.ReactNode
  first?: boolean
}) {
  return (
    <section
      className={[
        "space-y-4",
        first
          ? "pt-2"
          : "border-t border-gray-200 dark:border-gray-800 pt-8",
      ].join(" ")}
    >
      <SectionHeader title={title} />
      {children}
    </section>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-base font-semibold text-foreground leading-tight">
      {title}
    </div>
  )
}

function TwoColGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
      {children}
    </div>
  )
}

function FieldRow(props: {
  label: string
  value: string
  editing: boolean
  textarea?: boolean
  onChange: (val: string) => void
}) {
  const { label, value, editing, textarea, onChange } = props

  return (
    <>
      {/* linke Spalte = Label */}
      <div className="text-muted-foreground flex items-start pt-[6px]">
        {label}
      </div>

      {/* rechte Spalte = Wert ODER Input */}
      <div className="flex items-start">
        {editing ? (
          textarea ? (
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[64px]"
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-8"
            />
          )
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">
            {value || "—"}
          </div>
        )}
      </div>
    </>
  )
}

function MultiCheckGroup(props: {
  label: string
  options: string[]
  values: string[]
  editing: boolean
  onToggle: (option: string) => void
}) {
  const { label, options, values, editing, onToggle } = props

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
        {label}
      </div>

      {!editing ? (
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {values.length > 0 ? values.join(", ") : "—"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-start gap-2 text-sm leading-tight"
            >
              <Checkbox
                checked={values.includes(opt)}
                onCheckedChange={() => onToggle(opt)}
              />
              <span className="leading-tight">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
