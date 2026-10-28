// Everything about one pickup lives under ['pickup', id], so invalidating that prefix
// refreshes counts, folders and media together after any change.
export const pickupKeys = {
  all: (pickupId: string) => ['pickup', pickupId] as const,
  detail: (pickupId: string) => ['pickup', pickupId, 'detail'] as const,
  folders: (pickupId: string) => ['pickup', pickupId, 'folders'] as const,
  members: (pickupId: string) => ['pickup', pickupId, 'members'] as const,
  link: (pickupId: string) => ['pickup', pickupId, 'link'] as const,
  folderMedia: (pickupId: string, folderId: string) =>
    ['pickup', pickupId, 'folder', folderId, 'media'] as const,
}
