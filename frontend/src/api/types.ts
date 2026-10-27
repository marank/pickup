import type { components } from './schema'

type Schemas = components['schemas']

export type CreatedPickup = Schemas['CreatedPickup']
export type Folder = Schemas['Folder']
export type Media = Schemas['Media']
export type JoinRequest = Schemas['CreateFolderRequest']
export type UploadMediaRequest = Schemas['UploadMediaRequest']
export type UploadChunkRequest = Schemas['UploadChunkRequest']
