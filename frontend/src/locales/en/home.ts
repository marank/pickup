export default {
  explorerMock: {
    beachDay: 'Beach day',
    grandma: 'Grandma',
    n6Items1Selected: '6 items · 1 selected',
    summerParty: 'Summer party',
    youName: 'You: {name}',
  },
  findPickups: {
    checkYourInbox: 'Check your inbox',
    enterYourEmailAddressWe:
      'Enter your email address. We send you a list of the pickups it belongs to, each with your personal link.',
    lostYourLinks: 'Lost your links?',
    ok: 'OK',
    sending: 'Sending',
    youExampleCom: 'you@example.com',
  },
  homeView: {
    hero: {
      title: 'Pick up the photos',
      titleAccent: 'from your last event.',
      intro:
        'Everyone took pictures, but getting them all is always a hassle. Pickup collects them in one place: one link, and every guest gets their own folder. No accounts.',
    },
    steps: {
      heading: 'Three steps to get started',
      create: 'Give it a name. Nobody has to sign up or install an app.',
      send: {
        title: 'Send the link',
        text: 'Share it in the group chat or by email, or show the QR code at the party.',
      },
      add: {
        title: 'Everyone adds theirs',
        text: 'Each person gets a folder of their own and uploads straight from their phone.',
      },
    },
    features: {
      heading: 'Simple enough for everyone',
      subtitle: 'No app, no account, no instructions needed.',
      ownFolder: {
        title: 'A folder for everyone',
        text: 'Everyone sees everything, but only you can change what is in your folder.',
      },
      quality: {
        title: 'In full quality',
        text: 'Photos and videos arrive as they were taken, not compressed like in a chat. Download single ones or everything at once.',
      },
      timeline: {
        title: 'Everything in order',
        text: 'The timeline shows all photos of all folders in the order they were taken.',
      },
      private: {
        title: 'Private',
        text: 'Only people with the link can join. No public gallery, no ads, no tracking.',
      },
      noAccount: {
        title: 'No account',
        text: 'Your personal link logs you in on any device. Leave an email address and we send it to you.',
      },
      dates: {
        title: 'With an end date',
        text: 'If you like, uploads stop on a day you choose, and everything is deleted later.',
      },
    },
    faq: {
      heading: 'Questions',
      subtitle: 'The short answers.',
      see: {
        q: 'Who can see the photos?',
        a: 'Only people who joined with the link. The creator can also let everyone with the link look, or close the pickup.',
      },
      account: {
        q: 'Do I need an account or an app?',
        a: 'No. You open the link in your browser and pick a name.',
      },
      quality: {
        q: 'Are the photos made smaller?',
        a: 'No. Every photo and video is kept as it was uploaded, and that is what you download. Only the previews in the app are smaller.',
      },
      otherPhone: {
        q: 'How do I get back in on another phone?',
        a: 'Open your personal link. You got it when you joined, and by email if you left an address. Lost it? Enter your address on the pickup’s page, or ask whoever created the pickup.',
      },
      delete: {
        q: 'Who can delete photos?',
        a: 'Only you, in your own folder. The creator can remove files if needed, for example something uploaded by mistake.',
      },
      files: {
        q: 'Which files work?',
        a: 'Photos (JPG, PNG, HEIC, GIF, WebP) and videos (MP4, MOV, WebM and more), of any size.',
      },
      howLong: {
        q: 'How long do the photos stay?',
        a: 'Until the pickup is deleted: by hand, or automatically on a set day.',
      },
    },
    footer: { tagline: 'Pickup — collect photos together.', noTracking: 'No ads, no tracking.' },
  },
  startPanel: {
    creatingNewPickupsIsTurned: 'Creating new pickups is turned off on this server.',
  },
} as const
