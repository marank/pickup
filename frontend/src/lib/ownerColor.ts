const OWNER_COLORS = 6

/** CSS colour for a folder owner: stable per name, one of the --owner-N palette colours. */
export function ownerColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return `var(--owner-${(hash % OWNER_COLORS) + 1})`
}
