import type { Folder } from '@/api/types'

/** Folders of a pickup, indexed for tree navigation. */
export interface FolderTree {
  byId: Map<string, Folder>
  /** Children per parent id; '' is the pickup root (the members' top-level folders). */
  children: Map<string, Folder[]>
}

const ROOT = ''

const byName = (a: Folder, b: Folder) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

export function buildTree(folders: Folder[]): FolderTree {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const children = new Map<string, Folder[]>()
  for (const folder of folders) {
    const key = folder.parent ?? ROOT
    children.set(key, [...(children.get(key) ?? []), folder])
  }
  for (const list of children.values()) list.sort(byName)
  return { byId, children }
}

export function childrenOf(tree: FolderTree, folderId: string | null): Folder[] {
  return tree.children.get(folderId ?? ROOT) ?? []
}

/** The folders from the top level down to `folderId` (empty for the pickup root). */
export function pathTo(tree: FolderTree, folderId: string | null): Folder[] {
  const path: Folder[] = []
  let current = folderId ? tree.byId.get(folderId) : undefined
  while (current) {
    path.unshift(current)
    current = current.parent ? tree.byId.get(current.parent) : undefined
  }
  return path
}

/**
 * Resolve a typed path like "Alice/Holidays/Beach" (case-insensitive, extra slashes
 * ignored). Returns null for the root, undefined when a segment doesn't exist.
 */
export function findByPath(tree: FolderTree, path: string): Folder | null | undefined {
  const names = path
    .split('/')
    .map((name) => name.trim())
    .filter(Boolean)
  let current = null as Folder | null
  for (const name of names) {
    const match: Folder | undefined = childrenOf(tree, current?.id ?? null).find(
      (folder) => folder.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0,
    )
    if (!match) return undefined
    current = match
  }
  return current
}
