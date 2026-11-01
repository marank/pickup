import type { Messages } from '@/lib/i18n'

/** German for src/components, src/layouts, src/lib, src/router, App.vue (see lib/i18n.ts). */
const common: Messages = {
  // App: the area where messages pop up (screen readers)
  Notifications: 'Mitteilungen',
  // Menus: appearance and language
  Appearance: 'Darstellung',
  'Colour scheme': 'Farbschema',
  Dark: 'Dunkel',
  Language: 'Sprache',
  Light: 'Hell',
  'Like the browser': 'Wie der Browser',
  System: 'System',

  // Dialogs and cards
  Cancel: 'Abbrechen',
  Close: 'Schließen',
  'Go to the start page': 'Zur Startseite',

  // CopyField
  '{label} copied': '{label} kopiert',
  'Could not copy the {label}': '{label} konnte nicht kopiert werden',
  'Copy {label}': '{label} kopieren',

  // HomeLink (the logo in the header)
  'Pickup start page': 'Pickup-Startseite',
  'Leave the pickup?': 'Pickup verlassen?',
  'You stay logged in on this device. Open the pickup’s link to come back.':
    'Du bleibst auf diesem Gerät angemeldet. Öffne den Link der Pickup, um zurückzukommen.',
  'Open the pickup’s link to come back.': 'Öffne den Link der Pickup, um zurückzukommen.',
  'Stay here': 'Hierbleiben',

  // SplashScreen
  'Opening the pickup…': 'Pickup wird geöffnet …',

  // QrCard
  'Could not create the image': 'Das Bild konnte nicht erstellt werden',
  '{title} – QR code': '{title} – QR-Code',
  'QR code card for “{title}”': 'QR-Code-Karte für „{title}“',

  // lib/format.ts: relative dates
  Today: 'Heute',
  Yesterday: 'Gestern',
  '{n} days ago': ['vor 1 Tag', 'vor {n} Tagen'],

  // api/errors.ts
  'Request failed ({status})': 'Anfrage fehlgeschlagen ({status})',
}

export default common
