import { encode } from 'uqr'

import { BRAND, MARK, WORDMARK, type Tile } from '@/lib/brand'

/**
 * The printable QR card: Pickup logo and wordmark, the code with round dots, the pickup's
 * name. Drawn on a canvas, so the preview and the saved PNG are the same picture. Colours
 * are the palette's (main.css) as plain hex: paper of the light design, dots in the
 * background colour of the dark design.
 */
export const CARD = {
  width: 600,
  paper: BRAND.paper,
  dots: '#141210',
  tomato: BRAND.tomato,
  heading: '"Bricolage Grotesque Variable", system-ui, sans-serif',
}

const MARGIN = 72
const QR_TOP = 132
const QR_SIZE = CARD.width - 2 * MARGIN
const NAME_SIZE = 40
const NAME_LINE = 50
const NAME_MAX_LINES = 2

export function cardFonts(): string[] {
  return [`700 ${NAME_SIZE}px ${CARD.heading}`]
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

  // Mark and wordmark (lib/brand.ts), centred together.
  const markSize = 54
  const wordHeight = 40
  const wordWidth = (WORDMARK.width / WORDMARK.height) * wordHeight
  const gap = 12
  const left = (CARD.width - markSize - gap - wordWidth) / 2
  context.save()
  context.translate(left, 32)
  context.scale(markSize / MARK.size, markSize / MARK.size)
  context.strokeStyle = CARD.dots
  context.lineWidth = MARK.frame.stroke
  traceTile(context, MARK.frame)
  context.stroke()
  context.fillStyle = CARD.tomato
  traceTile(context, MARK.tile)
  context.fill()
  context.restore()
  context.save()
  context.translate(left + markSize + gap, 32 + (markSize - wordHeight) / 2)
  context.scale(wordHeight / WORDMARK.height, wordHeight / WORDMARK.height)
  context.fillStyle = CARD.dots
  context.fill(new Path2D(WORDMARK.d))
  context.fillStyle = CARD.tomato
  traceTile(context, WORDMARK.dot)
  context.fill()
  context.restore()

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

/** Start a path with a rounded square turned around its centre, as in the SVG logo. */
function traceTile(context: CanvasRenderingContext2D, tile: Tile) {
  const half = tile.size / 2
  context.save()
  context.translate(tile.x + half, tile.y + half)
  context.rotate((tile.rotate * Math.PI) / 180)
  context.beginPath()
  context.roundRect(-half, -half, tile.size, tile.size, tile.radius)
  context.restore()
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
