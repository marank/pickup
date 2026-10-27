export interface Pickup {
  id: string
  title: string
  created_at: string
  is_active: boolean
  share_url: string
  creator_member_id?: string
  creator_member_url?: string
  folder_count: number
  media_count: number
  is_creator: boolean
}

export interface JoinPickupResponse {
  folder: Folder
  member_id: string
  member_url: string
}

export interface Folder {
  id: string
  pickup: string
  name: string
  user_name: string
  user_email: string
  created_at: string
  media_count: number
  can_edit: boolean
  member_id?: string
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

export interface ApiResponse<T = any> {
  data: T
  message?: string
  error?: string
}
