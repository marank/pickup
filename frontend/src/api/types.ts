import type { components } from './schema'

type Schemas = components['schemas']

export type CreatedPickup = Schemas['CreatedPickup']
export type CreatePickupRequest = Schemas['CreatePickupRequest']
export type Folder = Schemas['Folder']
export type Media = Schemas['Media']
export type JoinRequest = Schemas['JoinRequest']
export type Pickup = Schemas['Pickup']
export type PickupSettings = Schemas['PatchedPickupUpdateRequest']
export type Member = Schemas['Member']
export type UploadMediaRequest = Schemas['UploadMediaRequest']
export type UploadChunkRequest = Schemas['UploadChunkRequest']
