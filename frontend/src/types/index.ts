export interface Pickup {
  id: string
  title: string
  created_at: string
  is_active: boolean
  share_url: string
  // Creator's personal link; only in the response that created the pickup
  member_url?: string
  folder_count: number
  media_count: number
  is_creator: boolean
}

export interface JoinPickupResponse {
  folder: Folder
  // Personal link with the secret access key, for coming back from another browser
  member_url: string
}

export interface Folder {
  id: string
  pickup: string
  name: string
  user_name: string
  created_at: string
  media_count: number
  can_edit: boolean
}

export interface Media {
  id: string
  folder: string
  file: string
  original_filename: string
  media_type: 'image' | 'video'
  file_size: number
  file_size_display: string
  uploaded_at: string
  caption: string
  can_edit: boolean
  is_image: boolean
  is_video: boolean
}

export interface CreateFolderRequest {
  name: string
  user_name: string
  user_email?: string
}

export interface CreatePickupRequest {
  title?: string
}

export interface UploadMediaRequest {
  file: File
  caption?: string
}
