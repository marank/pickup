import type { Messages } from '@/lib/i18n'

/** German for src/features/pickups, keyed by the English text (see lib/i18n.ts). */
const pickups: Messages = {
  // Shared within the pickup pages
  Back: 'Zurück',
  Cancel: 'Abbrechen',
  'Check your inbox for your personal link':
    'Schau in dein Postfach, dort ist dein persönlicher Link',
  'Could not send the mail': 'Die Mail konnte nicht gesendet werden',
  Email: 'E-Mail',
  'It is stored only as a hash.': 'Sie wird nur als Hash gespeichert.',
  'Open the pickup': 'Pickup öffnen',
  'Password of the pickup': 'Passwort der Pickup',
  'Personal link': 'Persönlicher Link',
  Save: 'Speichern',
  Saved: 'Gespeichert',
  Send: 'Senden',
  'the creator': 'die Ersteller:in',
  'The creator': 'Die Ersteller:in',
  'this pickup': 'diese Pickup',
  'Untitled pickup': 'Pickup ohne Titel',
  'Your email': 'Deine E-Mail-Adresse',
  'Your name': 'Dein Name',
  'Your personal link': 'Dein persönlicher Link',

  // AccountMenu
  Account: 'Konto',
  Appearance: 'Darstellung',
  'Copy my personal link': 'Meinen persönlichen Link kopieren',
  'Could not copy your link': 'Dein Link konnte nicht kopiert werden',
  'Could not log out': 'Abmelden fehlgeschlagen',
  'Create my folder': 'Meinen Ordner anlegen',
  'Creator of this pickup': 'Ersteller:in dieser Pickup',
  'Edit my details': 'Meine Angaben ändern',
  'Email me my personal link': 'Persönlichen Link per E-Mail schicken',
  Guest: 'Gast',
  'How Pickup works': 'So funktioniert Pickup',
  'Join this pickup': 'Bei dieser Pickup mitmachen',
  'Join to add your own photos': 'Mach mit, um eigene Fotos hinzuzufügen',
  'Log out': 'Abmelden',
  'Log out on this device?': 'Auf diesem Gerät abmelden?',
  'Member of this pickup': 'Teilnehmer:in dieser Pickup',
  'People & invitations': 'Personen & Einladungen',
  'Personal link copied': 'Persönlicher Link kopiert',
  'Pickup settings': 'Einstellungen der Pickup',
  'Viewing as a guest': 'Du schaust als Gast zu',
  You: 'Du',
  'You are logged out': 'Du bist abgemeldet',
  'You will be logged out on this device. To log in again as the creator, open your personal link. The pickup is not changed.':
    'Du wirst auf diesem Gerät abgemeldet. Um dich wieder als Ersteller:in anzumelden, öffne deinen persönlichen Link. An der Pickup ändert sich nichts.',
  'You will be logged out on this device. To log in again, open your personal link (from when you joined, or from your email). Your folder and files are kept.':
    'Du wirst auf diesem Gerät abgemeldet. Um dich wieder anzumelden, öffne deinen persönlichen Link (vom Mitmachen oder aus deiner E-Mail). Dein Ordner und deine Dateien bleiben erhalten.',

  // CreationCodeDialog
  Code: 'Code',
  Continue: 'Weiter',
  'Could not check the code': 'Der Code konnte nicht geprüft werden',
  'Enter your code': 'Gib deinen Code ein',
  'You need a code to create a pickup on this server.':
    'Um auf diesem Server eine Pickup anzulegen, brauchst du einen Code.',

  // EmailLinkDialog
  'With your personal link you can log in on any device. We also save the address, so you can request the link again later.':
    'Mit deinem persönlichen Link meldest du dich auf jedem Gerät an. Wir speichern auch die Adresse, damit du den Link später erneut anfordern kannst.',

  // IntroDialog
  'Add photos until {date}': 'Fotos hinzufügen bis zum {date}',
  'After that nobody adds or changes anything; looking and downloading go on.':
    'Danach fügt niemand mehr etwas hinzu oder ändert etwas; ansehen und herunterladen geht weiter.',
  'Also in your inbox.': 'Auch in deinem Postfach.',
  'Available until {date}': 'Verfügbar bis zum {date}',
  'Download single files, whole folders, or everything as a ZIP.':
    'Lade einzelne Dateien, ganze Ordner oder alles als ZIP herunter.',
  'Download what you want to keep before then.': 'Lade vorher herunter, was du behalten möchtest.',
  'Email it to me as well': 'Schick ihn mir auch per E-Mail',
  'Everything you add goes into your own folder.':
    'Alles, was du hinzufügst, landet in deinem eigenen Ordner.',
  "It isn't the link you joined with.": 'Es ist nicht der Link, mit dem du mitgemacht hast.',
  'It stays until {creator} deletes it.': 'Sie bleibt, bis {creator} sie löscht.',
  'Keep it to yourself: whoever opens it is you here.':
    'Behalte ihn für dich: Wer ihn öffnet, ist hier du.',
  "Let's go": 'Los geht’s',
  'Lost it, with no email stored? Only {creator} can give you a new one.':
    'Verloren, und keine E-Mail gespeichert? Nur {creator} kann dir einen neuen geben.',
  "Lost it? Have it sent to your address again from the pickup's page.":
    'Verloren? Lass ihn dir auf der Seite der Pickup erneut an deine Adresse schicken.',
  Next: 'Weiter',
  'Nothing is compressed, unlike in chat apps.': 'Anders als in Chat-Apps wird nichts komprimiert.',
  "On a new device you also need the pickup's password.":
    'Auf einem neuen Gerät brauchst du außerdem das Passwort der Pickup.',
  'On {date} it is deleted with everything in it.': 'Am {date} wird sie mit allem Inhalt gelöscht.',
  'Only for your link, so you can request it again yourself.':
    'Nur für deinen Link, damit du ihn selbst erneut anfordern kannst.',
  'Only you can upload, rename and delete in it, and make subfolders.':
    'Nur du kannst darin hochladen, umbenennen, löschen und Unterordner anlegen.',
  'Photos and videos, as they are': 'Fotos und Videos, so wie sie sind',
  'Read-only now': 'Jetzt schreibgeschützt',
  'Right now only {creator} can see the folders, yours included.':
    'Gerade kann nur {creator} die Ordner sehen, deinen eingeschlossen.',
  Share: 'Teilen',
  "So can anyone who has the pickup's link.": 'Genauso alle, die den Link der Pickup haben.',
  'Then the pickup is deleted with everything in it.':
    'Dann wird die Pickup mit allem Inhalt gelöscht.',
  'There are no accounts: this link logs you in, on any device.':
    'Es gibt keine Konten: Dieser Link meldet dich an, auf jedem Gerät.',
  'This is your folder': 'Das ist dein Ordner',
  'To invite others, use {share} at the top.': 'Um andere einzuladen, nutz oben {share}.',
  'Upload as many as you like at once, large videos too; they keep full quality.':
    'Lade so viele auf einmal hoch, wie du willst, auch große Videos; sie behalten ihre volle Qualität.',
  "You can look at everyone else's folders and download from them; they can see yours.":
    'Du kannst die Ordner aller anderen ansehen und daraus herunterladen; sie sehen deinen.',
  'Your personal link is your key': 'Dein persönlicher Link ist dein Schlüssel',
  '{name} can remove files if needed.': '{name} kann bei Bedarf Dateien entfernen.',

  // JoinForm
  'Ask the person who shared the link.': 'Frag die Person, die den Link geteilt hat.',
  'Could not join the pickup': 'Mitmachen fehlgeschlagen',
  'Email (optional)': 'E-Mail (optional)',
  'Folder name': 'Ordnername',
  'Join pickup': 'Mitmachen',
  'Joining…': 'Du machst mit …',
  'We send you your personal link, so you can log in on other devices.':
    'Wir schicken dir deinen persönlichen Link, damit du dich auf anderen Geräten anmelden kannst.',
  'Welcome! Your folder is ready.': 'Willkommen! Dein Ordner ist bereit.',

  // JoinPanel
  'Choose your name': 'Wähl deinen Namen',
  Closed: 'Geschlossen',
  'Join {title}': 'Bei {title} mitmachen',
  'Only invited people can take part. If you were invited, use the link from your invitation.':
    'Nur eingeladene Personen können mitmachen. Wenn du eingeladen wurdest, nutz den Link aus deiner Einladung.',
  'Private pickup': 'Private Pickup',
  'Protected with a password': 'Mit Passwort geschützt',
  'That personal link is not valid. Join below, or ask for a new link.':
    'Dieser persönliche Link ist ungültig. Mach unten mit oder frag nach einem neuen Link.',
  'The creator has closed this pickup. Nobody can look at or add photos right now.':
    'Die Ersteller:in hat diese Pickup geschlossen. Gerade kann niemand Fotos ansehen oder hinzufügen.',
  "This pickup doesn't take new participants anymore.":
    'Diese Pickup nimmt keine neuen Teilnehmenden mehr auf.',
  'This pickup is read-only now: nobody joins or adds photos anymore.':
    'Diese Pickup ist jetzt schreibgeschützt: Niemand macht mehr mit oder fügt Fotos hinzu.',
  "You get your own folder for uploads and can see everyone else's photos.":
    'Du bekommst einen eigenen Ordner zum Hochladen und siehst die Fotos aller anderen.',
  'Your folder gets this name; everyone in “{title}” sees it.':
    'Dein Ordner bekommt diesen Namen; alle in „{title}“ sehen ihn.',

  // LinkRequestForm
  'Already part of it on another device?': 'Auf einem anderen Gerät schon dabei?',
  'Enter the address you gave when you joined or were invited, and we email you your personal link.':
    'Gib die Adresse ein, die du beim Mitmachen oder bei der Einladung angegeben hast, und wir schicken dir deinen persönlichen Link.',
  'Please check the address': 'Bitte prüf die Adresse',

  // MemberDetailsDialog
  'A new address is only saved after you confirm it with the link we send to it.':
    'Eine neue Adresse wird erst gespeichert, wenn du sie über den Link bestätigst, den wir dorthin schicken.',
  'Could not save': 'Speichern fehlgeschlagen',
  'Everyone in the pickup sees your name and folder.':
    'Alle in der Pickup sehen deinen Namen und deinen Ordner.',
  Optional: 'Optional',
  'Saved. Enter a new address to change it': 'Gespeichert. Gib zum Ändern eine neue Adresse ein',
  'We send you your personal link to this address.':
    'Wir schicken dir deinen persönlichen Link an diese Adresse.',
  'Your details': 'Deine Angaben',
  'Your folder': 'Dein Ordner',

  // MemberEmailDialog
  'Add an email for {name}': 'E-Mail-Adresse für {name} hinzufügen',
  'Could not save the address': 'Die Adresse konnte nicht gespeichert werden',
  'Save and send': 'Speichern und senden',
  'Their email': 'E-Mail-Adresse der Person',
  'They get their personal link at this address right away, and can have it sent there again whenever they lose it. Only they can change it later.':
    'Die Person bekommt ihren persönlichen Link sofort an diese Adresse und kann ihn sich dorthin erneut schicken lassen, wenn sie ihn verliert. Ändern kann sie nur sie selbst.',

  // PackingAnimation
  'Almost done': 'Fast fertig',
  'Creating folders': 'Ordner werden angelegt',
  'Creating links': 'Links werden erstellt',
  'Creating your pickup…': 'Deine Pickup wird angelegt …',

  // PeoplePanel
  '(you)': '(du)',
  'Add their email and send them their link':
    'E-Mail-Adresse hinzufügen und Link an die Person schicken',
  'Anyone with the link can join; you can also invite people by email.':
    'Alle mit dem Link können mitmachen; du kannst auch Personen per E-Mail einladen.',
  'Copy the personal link of {name}': 'Persönlichen Link von {name} kopieren',
  'Copy their personal link, if they lost it':
    'Persönlichen Link der Person kopieren, falls sie ihn verloren hat',
  'Could not copy the link': 'Der Link konnte nicht kopiert werden',
  'Could not remove': 'Entfernen fehlgeschlagen',
  'Could not send the invitation': 'Die Einladung konnte nicht gesendet werden',
  Creator: 'Ersteller:in',
  'email stored privately': 'E-Mail privat gespeichert',
  'Everyone with a personal link to this pickup, including invitations not accepted yet.':
    'Alle mit einem persönlichen Link zu dieser Pickup, auch noch nicht angenommene Einladungen.',
  'Everyone with a personal link to this pickup. Privacy mode is off: addresses are stored and shown here.':
    'Alle mit einem persönlichen Link zu dieser Pickup. Der Privatsphäre-Modus ist aus: Adressen werden gespeichert und hier angezeigt.',
  Invite: 'Einladen',
  'Invite by email': 'Per E-Mail einladen',
  'Invitation sent again to {email}': 'Einladung erneut an {email} gesendet',
  'Invitation sent to {email}': 'Einladung an {email} gesendet',
  'Invited person': 'Eingeladene Person',
  'Invited, not joined yet': 'Eingeladen, noch nicht dabei',
  invitation: 'Einladung',
  Member: 'Teilnehmer:in',
  'Name (optional)': 'Name (optional)',
  'No folder yet': 'Noch kein Ordner',
  'Nobody new can join right now.': 'Gerade kann niemand Neues mitmachen.',
  'Only people you invite can take part.': 'Nur Personen, die du einlädst, können mitmachen.',
  Participants: 'Teilnehmende',
  People: 'Personen',
  'Personal link of {name} copied': 'Persönlicher Link von {name} kopiert',
  Remove: 'Entfernen',
  'Remove {name}': '{name} entfernen',
  'Remove {name}?': '{name} entfernen?',
  'Send the invitation to {name} again': 'Einladung erneut an {name} senden',
  'Send the link again': 'Link erneut senden',
  'The invitation': 'Die Einladung',
  'the invited person': 'der eingeladenen Person',
  'Their personal link stops working, and their folder with everything in it is deleted for everyone. This cannot be undone.':
    'Der persönliche Link der Person funktioniert dann nicht mehr, und ihr Ordner wird mit allem Inhalt für alle gelöscht. Das lässt sich nicht rückgängig machen.',
  'They get an email with a personal link from “{sender}”. If the address is already in the pickup, the link is sent again.':
    'Die Person bekommt eine E-Mail mit einem persönlichen Link von „{sender}“. Ist die Adresse schon in der Pickup, wird der Link erneut gesendet.',
  'this invitation': 'diese Einladung',
  'Whoever opens it takes part as them, so only give it to them.':
    'Wer ihn öffnet, macht als diese Person mit – gib ihn also nur ihr.',
  'active {when}': 'aktiv {when}',
  'added {when}': 'hinzugefügt {when}',
  '{name} removed': '{name} entfernt',

  // SettingsCard
  Discard: 'Verwerfen',

  // SettingsPanel
  Access: 'Zugang',
  'After {date} nobody joins, uploads or changes anything; everyone can still look and download. Everyone sees the date.':
    'Nach dem {date} macht niemand mehr mit, lädt hoch oder ändert etwas; ansehen und herunterladen können alle weiterhin. Alle sehen das Datum.',
  'Anyone with the link': 'Alle mit dem Link',
  'Anyone with the share link can join and upload.':
    'Alle mit dem Teilen-Link können mitmachen und hochladen.',
  'Anyone with the share link sees the photos, without joining.':
    'Alle mit dem Teilen-Link sehen die Fotos, auch ohne mitzumachen.',
  'At the end of {date} the pickup is deleted with all photos and videos. Everyone sees the date.':
    'Am Ende des {date} wird die Pickup mit allen Fotos und Videos gelöscht. Alle sehen das Datum.',
  'Could not delete the pickup': 'Die Pickup konnte nicht gelöscht werden',
  'Could not save the password': 'Das Passwort konnte nicht gespeichert werden',
  'Could not save the settings': 'Die Einstellungen konnten nicht gespeichert werden',
  'Current participants stay, nobody new can join.':
    'Bisherige Teilnehmende bleiben, niemand Neues kann mitmachen.',
  'Delete automatically': 'Automatisch löschen',
  'Delete for good': 'Endgültig löschen',
  'Delete pickup': 'Pickup löschen',
  'Delete this pickup': 'Diese Pickup löschen',
  'Delete “{title}” for good?': '„{title}“ endgültig löschen?',
  "Email addresses are stored only as a hash. You can't see them, and to send an invitation again you have to enter the address again. Off: addresses are stored and shown in the list of people.":
    'E-Mail-Adressen werden nur als Hash gespeichert. Du kannst sie nicht sehen, und um eine Einladung erneut zu senden, musst du die Adresse noch einmal eingeben. Aus: Adressen werden gespeichert und in der Personenliste angezeigt.',
  'Everyone who has the link can look at all photos, without joining.':
    'Alle, die den Link haben, können alle Fotos ansehen, ohne mitzumachen.',
  General: 'Allgemein',
  'How email addresses of participants are stored.':
    'Wie E-Mail-Adressen der Teilnehmenden gespeichert werden.',
  'In short:': 'Kurz gesagt:',
  'Name of the pickup': 'Name der Pickup',
  Never: 'Nie',
  'Never: people can add photos until the pickup is deleted.':
    'Nie: Fotos können hinzugefügt werden, bis die Pickup gelöscht wird.',
  'Never: the pickup stays until you delete it.': 'Nie: Die Pickup bleibt, bis du sie löschst.',
  'New password': 'Neues Passwort',
  'No password set.': 'Kein Passwort gesetzt.',
  'Nobody new': 'Niemand Neues',
  'Only invited people': 'Nur eingeladene Personen',
  'Only me (paused)': 'Nur ich (pausiert)',
  'Only participants': 'Nur Teilnehmende',
  'Only participants see the photos.': 'Nur Teilnehmende sehen die Fotos.',
  'Only people you invite can join and upload.':
    'Nur Personen, die du einlädst, können mitmachen und hochladen.',
  'Only the current participants upload; nobody new joins.':
    'Nur die bisherigen Teilnehmenden laden hoch; niemand Neues macht mit.',
  'Only you as the creator can change these.': 'Nur du als Ersteller:in kannst sie ändern.',
  'Only you still see the contents. Participants can’t look or upload, and nobody can join, until you open it again.':
    'Nur du siehst noch den Inhalt. Teilnehmende können nichts ansehen oder hochladen, und niemand kann mitmachen, bis du sie wieder öffnest.',
  Password: 'Passwort',
  'Password removed': 'Passwort entfernt',
  'Password saved': 'Passwort gespeichert',
  'Paused: only you see the photos, and nobody joins or uploads.':
    'Pausiert: Nur du siehst die Fotos, und niemand macht mit oder lädt hoch.',
  'People pick a new name and get their own folder.':
    'Personen wählen einen neuen Namen und bekommen einen eigenen Ordner.',
  'People without a login need it to join or to log in with their personal link.':
    'Wer nicht angemeldet ist, braucht es, um mitzumachen oder sich mit dem persönlichen Link anzumelden.',
  Privacy: 'Privatsphäre',
  'Privacy mode for email addresses': 'Privatsphäre-Modus für E-Mail-Adressen',
  'Read-only': 'Schreibgeschützt',
  'Recommended. Others with the link see the name of the pickup and how to join.':
    'Empfohlen. Andere mit dem Link sehen den Namen der Pickup und wie sie mitmachen können.',
  'Remove password': 'Passwort entfernen',
  'Removes the pickup with every folder, photo and video for everyone. This cannot be undone.':
    'Entfernt die Pickup mit allen Ordnern, Fotos und Videos für alle. Das lässt sich nicht rückgängig machen.',
  'Saving deletes all stored addresses of this pickup now.':
    'Beim Speichern werden alle gespeicherten Adressen dieser Pickup sofort gelöscht.',
  'Saving logs everyone else out of this pickup. They need their personal link and the password to come back. If you forget it, the server operator can remove it.':
    'Beim Speichern werden alle anderen von dieser Pickup abgemeldet. Um zurückzukommen, brauchen sie ihren persönlichen Link und das Passwort. Wenn du es vergisst, kann die Betreiber:in des Servers es entfernen.',
  Settings: 'Einstellungen',
  Storage: 'Speicherplatz',
  'Storage used': 'Belegter Speicherplatz',
  'The name everyone sees, and when the pickup goes away.':
    'Der Name, den alle sehen, und wann die Pickup verschwindet.',
  'The pickup': 'Die Pickup',
  'The server operator sets these limits. Ask them if you need more space.':
    'Diese Grenzen legt die Betreiber:in des Servers fest. Frag sie, wenn du mehr Platz brauchst.',
  'This pickup is protected with a password.': 'Diese Pickup ist mit einem Passwort geschützt.',
  'Who can join and upload?': 'Wer kann mitmachen und hochladen?',
  'Who can see the photos?': 'Wer kann die Fotos sehen?',
  'Who sees the photos, and who can join with a folder of their own.':
    'Wer die Fotos sieht und wer mit einem eigenen Ordner mitmachen kann.',
  'With a password, only participants see the photos.':
    'Mit Passwort sehen nur Teilnehmende die Fotos.',
  'You invite people by email; each gets a personal link.':
    'Du lädst Personen per E-Mail ein; alle bekommen einen persönlichen Link.',
  '{folders} and {files} are deleted for everyone, and all links stop working. There is no way to get them back.':
    '{folders} und {files} werden für alle gelöscht, und alle Links funktionieren nicht mehr. Es gibt keinen Weg, sie zurückzuholen.',
  '{n} files': ['1 Datei', '{n} Dateien'],
  '{n} folders': ['1 Ordner', '{n} Ordner'],
  '{size} used': '{size} belegt',
  '{title} was deleted': '{title} wurde gelöscht',
  '{used} of {limit} used': '{used} von {limit} belegt',

  // ConfirmEmailView
  'Address confirmed': 'Adresse bestätigt',
  'Confirming your address…': 'Deine Adresse wird bestätigt …',
  'Could not confirm the address': 'Die Adresse konnte nicht bestätigt werden',
  'Not confirmed': 'Nicht bestätigt',

  // CreateView
  '(optional)': '(optional)',
  "A shared place for everyone's photos and videos. Nobody needs an account.":
    'Ein gemeinsamer Ort für die Fotos und Videos aller. Niemand braucht ein Konto.',
  'Could not create the pickup': 'Die Pickup konnte nicht angelegt werden',
  'Create pickup': 'Pickup anlegen',
  'Creating pickups is turned off on this server.':
    'Das Anlegen von Pickups ist auf diesem Server ausgeschaltet.',
  Details: 'Details',
  'e.g. Anna & Mark’s wedding': 'z. B. Hochzeit von Anna & Mark',
  'Everyone with the link picks a name and gets a folder.':
    'Alle mit dem Link wählen einen Namen und bekommen einen Ordner.',
  Links: 'Links',
  'New pickup': 'Neue Pickup',
  'Only participants see the photos. You can change this and more later in the settings.':
    'Nur Teilnehmende sehen die Fotos. Das und mehr kannst du später in den Einstellungen ändern.',
  'Only people I invite': 'Nur Personen, die ich einlade',
  'Save QR card': 'QR-Karte speichern',
  'Send it to your guests, or print the QR card.':
    'Schick ihn deinen Gästen oder druck die QR-Karte aus.',
  'Share link': 'Teilen-Link',
  'Start a pickup': 'Pickup starten',
  Steps: 'Schritte',
  'We also emailed it to you.': 'Wir haben ihn dir auch per E-Mail geschickt.',
  'We send you your link to get back in.':
    'Wir schicken dir deinen Link, damit du wieder reinkommst.',
  'Who can join?': 'Wer kann mitmachen?',
  'With this link you log in as the creator on any device; keep it to yourself. You can copy it again from the account menu.':
    'Mit diesem Link meldest du dich auf jedem Gerät als Ersteller:in an; behalte ihn für dich. Du kannst ihn im Kontomenü jederzeit wieder kopieren.',
  'You get a folder with this name right away.':
    'Du bekommst sofort einen Ordner mit diesem Namen.',
  'You get two links.': 'Du bekommst zwei Links.',
  'Your pickup is ready': 'Deine Pickup ist bereit',
  '— for your guests': '– für deine Gäste',
  '— only for you': '– nur für dich',
  '“{title}” is ready': '„{title}“ ist bereit',

  // JoinView
  'Check the link you got, or ask for a new one.':
    'Prüf den Link, den du bekommen hast, oder frag nach einem neuen.',
  'Pickup not found': 'Pickup nicht gefunden',

  // MemberLinkView
  'Could not log in': 'Anmelden fehlgeschlagen',
  'Log in': 'Anmelden',
  'This logs you in on this device.': 'Damit meldest du dich auf diesem Gerät an.',
  'You are {name}, the creator.': 'Du bist {name}, die Ersteller:in.',
  'You are {name}.': 'Du bist {name}.',
  'Your personal link for': 'Dein persönlicher Link für',
}

export default pickups
