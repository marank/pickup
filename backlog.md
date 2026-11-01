# Backlog

Ideas that are not scheduled yet. Most important first.

## Bugs

- **Uploads failing on Android.** Some uploads from Android phones failed; the requests never
  reached the server (nothing in nginx's log). Needed: the error text from the upload list and
  roughly when it happened.

## Features

- **Location in photos.** Originals often carry GPS coordinates that every member can see.
  Mention it in the intro, or let the creator strip it from downloads.
- **Android: "Share → Pickup".** Send photos straight from Google Photos to a pickup; possible
  there as an installable web app (manifest, service worker, Web Share Target). Not on iPhones.
- **Motion Photos (Android).** The video is appended to the JPEG; the server could cut it out
  and the viewer play it (press and hold, or a "Live" button). The backfill would cover
  existing uploads.
- **Live Photos (iPhone).** Browsers only get the still. A photo and video of the same name
  (`IMG_1234.HEIC` + `IMG_1234.MOV`, uploaded via Files) could be joined into one live photo.

## Polish

- The intro's "Next" button moves between pages, because the pages differ in height and the
  dialog is centred.
