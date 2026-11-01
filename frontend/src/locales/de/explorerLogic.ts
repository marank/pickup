import type { Messages } from '@/lib/i18n'

/** German for src/features/explorer/{composables,lib,views} (see lib/i18n.ts). */
const explorerLogic: Messages = {
  // lib/actions.ts: what can be done with an item
  Open: 'Öffnen',
  'Download as ZIP': 'Als ZIP herunterladen',
  Download: 'Herunterladen',
  'Download {n} items as ZIP': '{n} Elemente als ZIP herunterladen',
  Rename: 'Umbenennen',
  'Edit caption': 'Bildunterschrift bearbeiten',
  Delete: 'Löschen',
  'Delete {n} items': '{n} Elemente löschen',

  // lib/uploadErrors.ts: why an upload failed
  'The file is too large to send in one go.': 'Die Datei ist zu groß, um sie am Stück zu senden.',
  'Too many uploads at once. Try again in a minute.':
    'Zu viele Uploads auf einmal. Versuch es in einer Minute noch mal.',
  'The server had a problem. Try again in a moment.':
    'Der Server hatte ein Problem. Versuch es gleich noch mal.',
  'The server refused the file ({status}).': 'Der Server hat die Datei abgelehnt ({status}).',
  'You are offline. Try again once you have a connection.':
    'Du bist offline. Versuch es noch mal, sobald du wieder Verbindung hast.',
  'The connection broke off. Try again.': 'Die Verbindung ist abgebrochen. Versuch es noch mal.',

  // lib/dates.ts: the pickup's dates in the header
  'Read-only': 'Schreibgeschützt',
  'Uploads until {date}': 'Uploads bis {date}',
  'Deleted after {date}': 'Gelöscht nach dem {date}',

  // lib/items.ts: the type column
  Folder: 'Ordner',
  Video: 'Video',
  Image: 'Bild',

  // composables/useExplorer.ts: uploads and deleting
  'Untitled pickup': 'Pickup ohne Titel',
  'You can only upload into your own folders.': 'Du kannst nur in deine eigenen Ordner hochladen.',
  '{name} is not a photo or video': '{name} ist kein Foto und kein Video',
  "{name} doesn't fit: {free} of storage left": '{name} passt nicht: nur noch {free} Speicher frei',
  '“{name}” deleted': '„{name}“ gelöscht',
  'Could not delete the folder': 'Der Ordner konnte nicht gelöscht werden',
  'Could not delete the file': 'Die Datei konnte nicht gelöscht werden',

  // views/ExplorerView.vue: dialogs and toasts
  '“{name}” will be removed for everyone, including everything inside. This cannot be undone.':
    '„{name}“ wird für alle entfernt, samt allem, was darin liegt. Das lässt sich nicht rückgängig machen.',
  '“{name}” will be removed for everyone. This cannot be undone.':
    '„{name}“ wird für alle entfernt. Das lässt sich nicht rückgängig machen.',
  '{n} items will be removed for everyone, including everything inside. This cannot be undone.':
    '{n} Elemente werden für alle entfernt, samt allem, was darin liegt. Das lässt sich nicht rückgängig machen.',
  '{n} items will be removed for everyone. This cannot be undone.':
    '{n} Elemente werden für alle entfernt. Das lässt sich nicht rückgängig machen.',
  'Folder “{name}” created': 'Ordner „{name}“ erstellt',
  'Could not create the folder': 'Der Ordner konnte nicht erstellt werden',
  'Folder renamed': 'Ordner umbenannt',
  'Could not rename': 'Umbenennen fehlgeschlagen',
  'Caption saved': 'Bildunterschrift gespeichert',
  'Could not save the caption': 'Die Bildunterschrift konnte nicht gespeichert werden',
  'Pickup not found': 'Pickup nicht gefunden',
  'Check the link you got, or ask for a new one.':
    'Prüf den Link, den du bekommen hast, oder frag nach einem neuen.',
  Folders: 'Ordner',
  'Choose a folder to open': 'Wähl einen Ordner zum Öffnen',
  'New folder': 'Neuer Ordner',
  Name: 'Name',
  Create: 'Erstellen',
  'Rename folder': 'Ordner umbenennen',
  Caption: 'Bildunterschrift',
  Save: 'Speichern',
  'Delete?': 'Löschen?',
}

export default explorerLogic
