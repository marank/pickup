export default {
  connectView: {
    title: 'Diesen Server zur App hinzufügen',
    intro:
      'Ist dieser Server in der Pickup-App eingetragen, kannst du hier direkt vom Handy aus neue Pickups erstellen.',
    openInApp: 'In der Pickup-App öffnen',
    orPaste:
      'Es passiert nichts? Kopier den Link und füg ihn in der App unter „Link hinzufügen“ ein.',
    linkLabel: 'Link',
    withCode:
      'Der Link enthält einen Code zum Erstellen von Pickups, und die App merkt ihn sich. Gib ihn nur an Leute weiter, die hier Pickups erstellen dürfen.',
    needsCode: 'Zum Erstellen von Pickups braucht es hier einen Code. Die App fragt danach.',
    creationOff:
      'Auf diesem Server kann niemand neue Pickups erstellen. Seine Pickups öffnet die App trotzdem.',
    useInBrowser: 'Pickup lieber im Browser nutzen',
  },
  explorerMock: {
    beachDay: 'Strandtag',
    grandma: 'Oma',
    n6Items1Selected: '6 Elemente · 1 ausgewählt',
    summerParty: 'Sommerfest',
    youName: 'Du: {name}',
  },
  findPickups: {
    checkYourInbox: 'Schau in dein Postfach',
    enterYourEmailAddressWe:
      'Gib deine E-Mail-Adresse ein. Wir schicken dir eine Liste der Pickups, zu denen sie gehört – jeweils mit deinem persönlichen Link.',
    lostYourLinks: 'Links verloren?',
    ok: 'OK',
    sending: 'Wird gesendet',
    youExampleCom: 'du@beispiel.de',
  },
  homeView: {
    hero: {
      title: 'Hol dir die Fotos',
      titleAccent: 'von eurem letzten Fest.',
      intro:
        'Alle haben fotografiert, aber alle Bilder zusammenzubekommen, ist jedes Mal mühsam. Pickup sammelt sie an einem Ort: ein Link, und alle Gäste bekommen ihren eigenen Ordner. Ganz ohne Accounts.',
    },
    steps: {
      heading: 'Drei Schritte, um loszulegen',
      create: 'Gib ihm einen Namen. Niemand muss sich registrieren oder eine App installieren.',
      send: {
        title: 'Link verschicken',
        text: 'Teile ihn im Gruppenchat oder per E-Mail, oder zeig den QR-Code auf dem Fest.',
      },
      add: {
        title: 'Alle laden hoch',
        text: 'Jede Person bekommt einen eigenen Ordner und lädt direkt vom Handy hoch.',
      },
    },
    features: {
      heading: 'So einfach, dass alle mitmachen können',
      subtitle: 'Ohne App, ohne Account, ohne Anleitung.',
      ownFolder: {
        title: 'Ein Ordner für jede Person',
        text: 'Alle sehen alles, aber nur du änderst, was in deinem Ordner liegt.',
      },
      quality: {
        title: 'In voller Qualität',
        text: 'Fotos und Videos kommen so an, wie sie aufgenommen wurden, nicht komprimiert wie im Chat. Herunterladen einzeln oder alles auf einmal.',
      },
      timeline: {
        title: 'Alles in der richtigen Reihenfolge',
        text: 'Die Zeitleiste zeigt die Fotos aller Ordner in der Reihenfolge, in der sie aufgenommen wurden.',
      },
      private: {
        title: 'Privat',
        text: 'Nur wer den Link hat, kann mitmachen. Keine öffentliche Galerie, keine Werbung, kein Tracking.',
      },
      noAccount: {
        title: 'Ohne Account',
        text: 'Dein persönlicher Link meldet dich auf jedem Gerät an. Hinterlege eine E-Mail-Adresse, dann schicken wir ihn dir.',
      },
      dates: {
        title: 'Mit Enddatum',
        text: 'Auf Wunsch enden die Uploads an einem Tag deiner Wahl, und später wird alles gelöscht.',
      },
    },
    faq: {
      heading: 'Fragen',
      subtitle: 'Kurz beantwortet.',
      see: {
        q: 'Wer kann die Fotos sehen?',
        a: 'Nur wer über den Link mitmacht. Wer den Pickup erstellt hat, kann ihn auch für alle mit Link zum Ansehen öffnen oder ganz schließen.',
      },
      account: {
        q: 'Brauche ich einen Account oder eine App?',
        a: 'Nein. Du öffnest den Link im Browser und wählst einen Namen.',
      },
      quality: {
        q: 'Werden die Fotos verkleinert?',
        a: 'Nein. Jedes Foto und Video bleibt so, wie es hochgeladen wurde, und genau so lädst du es herunter. Nur die Vorschaubilder in der App sind kleiner.',
      },
      otherPhone: {
        q: 'Wie komme ich auf einem anderen Handy wieder hinein?',
        a: 'Öffne deinen persönlichen Link. Du hast ihn beim Mitmachen bekommen, und per E-Mail, falls du eine Adresse angegeben hast. Verloren? Gib deine Adresse auf der Seite des Pickups ein oder frag die Person, die ihn erstellt hat.',
      },
      delete: {
        q: 'Wer kann Fotos löschen?',
        a: 'Nur du, in deinem eigenen Ordner. Wer den Pickup erstellt hat, kann bei Bedarf Dateien entfernen, etwa versehentlich hochgeladene.',
      },
      files: {
        q: 'Welche Dateien gehen?',
        a: 'Fotos (JPG, PNG, HEIC, GIF, WebP) und Videos (MP4, MOV, WebM und mehr), egal wie groß.',
      },
      howLong: {
        q: 'Wie lange bleiben die Fotos?',
        a: 'Bis der Pickup gelöscht wird: von Hand oder automatisch an einem festgelegten Tag.',
      },
    },
    footer: {
      tagline: 'Pickup – Fotos gemeinsam sammeln.',
      noTracking: 'Keine Werbung, kein Tracking.',
    },
  },
  startPanel: {
    creatingNewPickupsIsTurned: 'Auf diesem Server können keine neuen Pickups angelegt werden.',
  },
} as const
