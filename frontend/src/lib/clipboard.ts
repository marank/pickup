/**
 * Copies text that is still being loaded (a link from the API). Safari only lets a page
 * write to the clipboard during the click itself, not after an `await`, so where browsers
 * support it the text goes to the clipboard as a promise right away.
 */
export async function copyText(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !('write' in navigator.clipboard)) {
    return navigator.clipboard.writeText(await text)
  }
  const blob = text.then((value) => new Blob([value], { type: 'text/plain' }))
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
  } catch (err) {
    await text // loading the text failed: report that error instead of the clipboard's
    throw err
  }
}
