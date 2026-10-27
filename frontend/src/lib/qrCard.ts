import { encode } from 'uqr'

/**
 * The printable QR card: Pickup logo and wordmark, the code with round dots, the pickup's
 * name. Drawn on a canvas, so the preview and the saved PNG are the same picture. Colours
 * are the palette's (main.css) as plain hex: paper of the light design, dots in the
 * background colour of the dark design.
 */
export const CARD = {
  width: 600,
  paper: '#f8f5ef',
  dots: '#141210',
  tomato: '#e75528',
  sage: '#75a189',
  heading: '"Bricolage Grotesque Variable", system-ui, sans-serif',
}

const MARGIN = 72
const QR_TOP = 132
const QR_SIZE = CARD.width - 2 * MARGIN
const NAME_SIZE = 40
const NAME_LINE = 50
const NAME_MAX_LINES = 2

/** The parcel tag of PickupLogo.vue (viewBox 0 0 40 28). */
const LOGO = {
  string: 'M2 14 C 2 9, 6 6, 10 6',
  tag: 'M12 3 h22 a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 h-22 l-8 -11 z',
  lines: 'M20 11 h12 M20 17 h8',
}

export function cardFonts(): string[] {
  return [`700 36px ${CARD.heading}`, `700 ${NAME_SIZE}px ${CARD.heading}`]
}

/** Split the name into at most two lines that fit, with an ellipsis if it is longer. */
export function nameLines(
  name: string,
  fits: (text: string) => boolean,
  maxLines = NAME_MAX_LINES,
): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const [index, word] of words.entries()) {
    const candidate = line ? `${line} ${word}` : word
    if (fits(candidate) || !line) {
      line = candidate
      continue
    }
    if (lines.length === maxLines - 1) {
      line = `${line} ${words.slice(index).join(' ')}`
      break
    }
    lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  const last = lines.length - 1
  if (last >= 0 && !fits(lines[last]!)) {
    let text = lines[last]!
    while (text.length > 1 && !fits(`${text}…`)) text = text.slice(0, -1)
    lines[last] = `${text.trimEnd()}…`
  }
  return lines
}

export function cardHeight(lines: number): number {
  return QR_TOP + QR_SIZE + 44 + Math.max(lines, 1) * NAME_LINE + 48
}

/** Draw the card at `scale` × 600 px wide; returns the height used (in card units). */
export function drawQrCard(
  context: CanvasRenderingContext2D,
  value: string,
  title: string,
  scale = 1,
): number {
  context.font = `700 ${NAME_SIZE}px ${CARD.heading}`
  const lines = nameLines(title, (text) => context.measureText(text).width <= QR_SIZE)
  const height = cardHeight(lines.length)

  context.save()
  context.scale(scale, scale)
  context.fillStyle = CARD.paper
  context.fillRect(0, 0, CARD.width, height)

  // Logo and wordmark, centred together.
  context.font = `700 36px ${CARD.heading}`
  const word = 'pickup'
  const logoWidth = 54 // 40 × 28 viewBox at 38.5 px height
  const gap = 12
  const total = logoWidth + gap + context.measureText(word).width
  const left = (CARD.width - total) / 2
  context.save()
  context.translate(left, 40)
  context.scale(logoWidth / 40, logoWidth / 40)
  context.strokeStyle = CARD.sage
  context.lineWidth = 2
  context.lineCap = 'round'
  context.stroke(new Path2D(LOGO.string))
  context.fillStyle = CARD.tomato
  context.fill(new Path2D(LOGO.tag))
  context.fillStyle = CARD.paper
  context.beginPath()
  context.arc(12.5, 14, 2.6, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = CARD.paper
  context.lineWidth = 2.2
  context.stroke(new Path2D(LOGO.lines))
  context.restore()
  context.fillStyle = CARD.dots
  context.textBaseline = 'middle'
  context.fillText(word, left + logoWidth + gap, 40 + 19)

  drawCode(context, value, MARGIN, QR_TOP, QR_SIZE)

  context.font = `700 ${NAME_SIZE}px ${CARD.heading}`
  context.textAlign = 'center'
  context.textBaseline = 'top'
  lines.forEach((line, index) =>
    context.fillText(line, CARD.width / 2, QR_TOP + QR_SIZE + 44 + index * NAME_LINE),
  )
  context.restore()
  return height
}

/** Round dots for the data, rounded squares for the three finder patterns. */
function drawCode(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
) {
  const { data, size: count } = encode(value, { border: 0, ecc: 'Q' })
  const module = size / count
  const finders = [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ] as const
  const inFinder = (col: number, row: number) =>
    finders.some(([fx, fy]) => col >= fx && col < fx + 7 && row >= fy && row < fy + 7)

  context.fillStyle = CARD.dots
  data.forEach((cells, row) =>
    cells.forEach((dark, col) => {
      if (!dark || inFinder(col, row)) return
      context.beginPath()
      context.arc(x + (col + 0.5) * module, y + (row + 0.5) * module, module * 0.42, 0, Math.PI * 2)
      context.fill()
    }),
  )
  for (const [fx, fy] of finders) {
    const left = x + fx * module
    const top = y + fy * module
    context.fillStyle = CARD.dots
    context.beginPath()
    context.roundRect(left, top, 7 * module, 7 * module, 2 * module)
    context.fill()
    context.fillStyle = CARD.paper
    context.beginPath()
    context.roundRect(left + module, top + module, 5 * module, 5 * module, 1.4 * module)
    context.fill()
    context.fillStyle = CARD.dots
    context.beginPath()
    context.roundRect(left + 2 * module, top + 2 * module, 3 * module, 3 * module, module)
    context.fill()
  }
}
