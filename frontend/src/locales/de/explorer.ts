import type { Messages } from '@/lib/i18n'

/** German for src/features/explorer/components, keyed by the English text (see lib/i18n.ts). */
const explorer: Messages = {
  // Shared by several components
  'Untitled pickup': 'Pickup ohne Titel',
  Settings: 'Einstellungen',
  People: 'Personen',
  Upload: 'Hochladen',
  'Upload photos or videos': 'Fotos oder Videos hochladen',
  'New folder': 'Neuer Ordner',
  'Create your folder': 'Eigenen Ordner anlegen',
  'Join to upload': 'Mitmachen und hochladen',
  Rename: 'Umbenennen',
  'Edit caption': 'Bildunterschrift bearbeiten',
  Caption: 'Bildunterschrift',
  Download: 'Herunterladen',
  Delete: 'Löschen',
  'Download folder': 'Ordner herunterladen',
  'Download all': 'Alles herunterladen',
  Cancel: 'Abbrechen',
  Close: 'Schließen',
  Commands: 'Befehle',
  Details: 'Details',
  Content: 'Inhalt',
  'Small icons': 'Kleine Symbole',
  'Large icons': 'Große Symbole',
  Name: 'Name',
  'Date added': 'Hinzugefügt am',
  Size: 'Größe',
  Type: 'Typ',
  Owner: 'Besitzer:in',
  Added: 'Hinzugefügt',
  'Sort by': 'Sortieren nach',
  Ascending: 'Aufsteigend',
  Descending: 'Absteigend',
  View: 'Ansicht',
  Folders: 'Ordner',
  'Folder contents': 'Ordnerinhalt',
  'Up one level': 'Eine Ebene nach oben',
  Refresh: 'Aktualisieren',
  Search: 'Suchen',
  'Close search': 'Suche schließen',
  'Search this folder': 'Diesen Ordner durchsuchen',
  '{n} selected': '{n} ausgewählt',
  '{n} items': ['1 Element', '{n} Elemente'],
  '{used} of {limit}': '{used} von {limit}',
  'Your folder: {name}': 'Dein Ordner: {name}',
  'Viewing only': 'Nur ansehen',

  // AddressBar
  "“{path}” doesn't exist": '„{path}“ gibt es nicht',
  'Folder path': 'Ordnerpfad',
  'Folders in {name}': 'Ordner in {name}',
  'Type a path (Ctrl+L)': 'Pfad eingeben (Strg+L)',

  // CaptionDialog
  'Add a caption…': 'Bildunterschrift hinzufügen …',

  // CommandBar
  'Download this folder as ZIP': 'Diesen Ordner als ZIP herunterladen',
  'Download everything as ZIP': 'Alles als ZIP herunterladen',
  Sort: 'Sortieren',
  'Details pane': 'Detailbereich',

  // ContentPane
  'Nobody has joined yet.': 'Noch hat niemand mitgemacht.',
  'Drop photos and videos here, or use Upload.':
    'Zieh Fotos und Videos hierher oder nutze „Hochladen“.',
  "{name} hasn't added anything here yet.": '{name} hat hier noch nichts hinzugefügt.',
  'The owner': 'Die Besitzer:in',
  Contents: 'Inhalt',
  'Read-only now: you can look and download, but nobody adds anything anymore.':
    'Jetzt schreibgeschützt: Du kannst alles ansehen und herunterladen, aber niemand fügt mehr etwas hinzu.',
  "This folder doesn't exist anymore.": 'Diesen Ordner gibt es nicht mehr.',
  'Back to the pickup': 'Zurück zur Pickup',
  'Nothing here yet': 'Noch nichts da',
  'Add your photos and videos, several at once. They keep their full quality.':
    'Füge deine Fotos und Videos hinzu, gern mehrere auf einmal. Sie behalten ihre volle Qualität.',
  'Drop them here or add your photos and videos, several at once. They keep their full quality.':
    'Zieh deine Fotos und Videos hierher oder füge sie hinzu, gern mehrere auf einmal. Sie behalten ihre volle Qualität.',
  'Upload photos and videos': 'Fotos und Videos hochladen',
  'Nothing here matches “{search}”.': 'Hier passt nichts zu „{search}“.',
  'Drop to upload into “{name}”': 'Loslassen, um in „{name}“ hochzuladen',

  // DetailsPane
  '{n} items selected': '{n} Elemente ausgewählt',
  '{size} in files': '{size} in Dateien',
  Contains: 'Enthält',
  'No caption': 'Keine Bildunterschrift',
  Files: 'Dateien',
  Started: 'Begonnen',
  'Everyone who joins gets a folder in their colour. Select something to see its details.':
    'Alle, die mitmachen, bekommen einen Ordner in ihrer Farbe. Wähle etwas aus, um die Details zu sehen.',

  // FolderTree
  'No folders yet.': 'Noch keine Ordner.',
  Pickup: 'Pickup',

  // ItemMenu, ItemsDetails, ItemThumb
  'Actions for {name}': 'Aktionen für {name}',
  Actions: 'Aktionen',
  Video: 'Video',

  // MediaViewer
  Previous: 'Vorheriges',
  Next: 'Weiter',
  'Swipe for the next one · pinch to zoom · swipe down to close':
    'Wischen fürs nächste · zum Zoomen auseinanderziehen · nach unten wischen zum Schließen',

  // MobileToolbar
  More: 'Mehr',
  'Download selected': 'Auswahl herunterladen',
  'Delete selected': 'Auswahl löschen',

  // NavBar
  Back: 'Zurück',
  Forward: 'Vor',
  'Up one level (Backspace)': 'Eine Ebene nach oben (Rücktaste)',

  // OwnBadge
  'Your folder': 'Dein Ordner',
  You: 'Du',

  // PagePane
  'Only the creator of this pickup can open this.':
    'Nur wer diese Pickup erstellt hat, kann das öffnen.',

  // PickupBar
  'Then nobody adds or changes anything': 'Dann fügt niemand mehr etwas hinzu oder ändert etwas',
  'Then everything is deleted': 'Dann wird alles gelöscht',
  Share: 'Teilen',

  // ShareDialog
  'Add your photos to “{title}”': 'Füge deine Fotos zu „{title}“ hinzu',
  'Invite people': 'Leute einladen',
  'The pickup is closed: with this link people only see that it exists. Open it again in Settings.':
    'Die Pickup ist geschlossen: Mit diesem Link sieht man nur, dass es sie gibt. In den Einstellungen kannst du sie wieder öffnen.',
  'Only invited people can take part — invite them under People. With this link others can look at the photos.':
    'Nur Eingeladene können mitmachen – lade sie unter „Teilnehmende“ ein. Mit diesem Link können sich andere die Fotos ansehen.',
  'Only invited people can take part — invite them under People. With this link others only see that the pickup exists.':
    'Nur Eingeladene können mitmachen – lade sie unter „Teilnehmende“ ein. Mit diesem Link sehen andere nur, dass es die Pickup gibt.',
  'Nobody new can join right now. Everyone with this link can look at the photos.':
    'Gerade kann niemand Neues mitmachen. Alle mit diesem Link können sich die Fotos ansehen.',
  'Nobody new can join right now.': 'Gerade kann niemand Neues mitmachen.',
  'Everyone with this link can join with their own folder and look at the photos.':
    'Alle mit diesem Link können mit einem eigenen Ordner mitmachen und sich die Fotos ansehen.',
  'Everyone with this link can join with their own folder.':
    'Alle mit diesem Link können mit einem eigenen Ordner mitmachen.',
  'Share link': 'Teilen-Link',
  '— for everyone': '– für alle',
  'Scan to open the pickup. Save the card as an image to print or share it.':
    'Scannen öffnet die Pickup. Speichere die Karte als Bild, um sie zu drucken oder zu teilen.',
  'Save QR card': 'QR-Karte speichern',
  'Share via …': 'Teilen über …',
  "Don't send your personal link instead: it is only for you and logs in as you.":
    'Schick nicht stattdessen deinen persönlichen Link: Er ist nur für dich und meldet als du an.',

  // TreeNode, TreeToggle
  'Collapse {name}': '{name} zuklappen',
  'Expand {name}': '{name} aufklappen',
  'Hide folders': 'Ordner ausblenden',
  'Show folders': 'Ordner einblenden',

  // UploadQueueList
  Waiting: 'Wartet',
  Uploading: 'Lädt hoch',
  Done: 'Fertig',
  'Already there': 'Schon da',
  Failed: 'Fehlgeschlagen',
  Cancelled: 'Abgebrochen',
  'Clear finished': 'Erledigte entfernen',
  chunked: 'in Teilen',
  Retry: 'Erneut versuchen',

  // UploadTray
  'Uploading {current} of {total}': 'Lade {current} von {total} hoch',
  '{done} of {total} uploaded, {skipped} already there':
    '{done} von {total} hochgeladen, {skipped} schon da',
  '{done} of {total} uploaded': '{done} von {total} hochgeladen',
  '{n} uploads failed': ['1 Upload fehlgeschlagen', '{n} Uploads fehlgeschlagen'],
  Uploads: 'Uploads',

  // TimelinePane, TimelineToggle, FolderTree: everyone's photos by the time they were taken
  Timeline: 'Zeitleiste',
  'Show photos of': 'Fotos zeigen von',
  'Show everyone': 'Alle zeigen',
  'No photos yet': 'Noch keine Fotos',
  'As soon as someone uploads, everything shows up here in the order it was taken, from all folders.':
    'Sobald jemand etwas hochlädt, erscheint hier alles in der Reihenfolge, in der es aufgenommen wurde – aus allen Ordnern.',
  'Go to my folder': 'Zu meinem Ordner',
  '{name}, by {owner}, {time}': '{name}, von {owner}, {time}',
  Days: 'Tage',
  'Back to the folders': 'Zurück zu den Ordnern',
  'All photos by the time they were taken': 'Alle Fotos nach Aufnahmezeit',
  '{n} photos and videos': ['1 Foto oder Video', '{n} Fotos und Videos'],
  'by {n} people': ['von 1 Person', 'von {n} Personen'],
}

export default explorer
