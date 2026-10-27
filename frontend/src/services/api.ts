import axios from 'axios'
import type { AxiosResponse } from 'axios'
import type { 
  Pickup, 
  Folder, 
  Media, 
  CreateFolderRequest, 
  CreatePickupRequest, 
  UploadMediaRequest,
  JoinPickupResponse,
  ApiResponse 
} from '@/types'

// Same origin as the SPA: Vite proxies the API in development, nginx in production.
const api = axios.create({
  // Django's CSRF cookie/header names; DRF checks them for logged-in (admin) sessions.
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to handle cookies
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access')
    }
    return Promise.reject(error)
  }
)

const memberParams = (memberId?: string) => memberId ? { member_id: memberId } : {}

export const pickupApi = {
  // Create a new pickup
  createPickup: async (data: CreatePickupRequest): Promise<AxiosResponse<Pickup>> => {
    return api.post('/create-pickup/', data)
  },

  // Get pickup details (with optional member authentication)
  getPickup: async (id: string, memberId?: string): Promise<AxiosResponse<Pickup>> => {
    return api.get(`/api/pickups/${id}/`, {
      params: memberParams(memberId)
    })
  },

  // Join a pickup (create/access folder and member)
  joinPickup: async (id: string, data: CreateFolderRequest): Promise<AxiosResponse<JoinPickupResponse>> => {
    return api.post(`/api/pickups/${id}/join/`, data)
  },

  // Get all folders in a pickup (with optional member authentication)
  getFolders: async (id: string, memberId?: string): Promise<AxiosResponse<Folder[]>> => {
    return api.get(`/api/pickups/${id}/folders/`, {
      params: memberParams(memberId)
    })
  },

  // Get all media in a pickup (with optional member authentication)
  getAllMedia: async (id: string, memberId?: string): Promise<AxiosResponse<Media[]>> => {
    return api.get(`/api/pickups/${id}/media/`, {
      params: memberParams(memberId)
    })
  },
}

export const folderApi = {
  // Get folder details
  getFolder: async (
    pickupId: string,
    folderId: string,
    memberId?: string
  ): Promise<AxiosResponse<Folder>> => {
    return api.get(`/api/pickups/${pickupId}/folders/${folderId}/`, {
      params: memberParams(memberId)
    })
  },

  // Get media in a folder
  getMedia: async (
    pickupId: string,
    folderId: string,
    memberId?: string
  ): Promise<AxiosResponse<Media[]>> => {
    return api.get(`/api/pickups/${pickupId}/folders/${folderId}/media/`, {
      params: memberParams(memberId)
    })
  },

  // Upload media to a folder
  uploadMedia: async (
    pickupId: string,
    folderId: string,
    data: UploadMediaRequest,
    memberId?: string,
    signal?: AbortSignal
  ): Promise<AxiosResponse<Media>> => {
    const formData = new FormData()
    formData.append('file', data.file)
    if (data.caption) {
      formData.append('caption', data.caption)
    }
    if (memberId) {
      formData.append('member_id', memberId)
    }

    return api.post(`/api/pickups/${pickupId}/folders/${folderId}/media/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
    })
  },

  // Clear all media in a folder
  clearFolder: async (
    pickupId: string,
    folderId: string,
    memberId?: string
  ): Promise<AxiosResponse<{ message: string }>> => {
    return api.delete(`/api/pickups/${pickupId}/folders/${folderId}/clear/`, {
      params: memberParams(memberId)
    })
  },
}

export const mediaApi = {
  // Update media caption
  updateCaption: async (
    pickupId: string,
    folderId: string,
    mediaId: string,
    caption: string,
    memberId?: string
  ): Promise<AxiosResponse<Media>> => {
    return api.patch(`/api/pickups/${pickupId}/folders/${folderId}/media/${mediaId}/caption/`, {
      caption,
    }, {
      params: memberParams(memberId)
    })
  },

  // Delete media
  deleteMedia: async (
    pickupId: string,
    folderId: string,
    mediaId: string,
    memberId?: string
  ): Promise<AxiosResponse<void>> => {
    return api.delete(`/api/pickups/${pickupId}/folders/${folderId}/media/${mediaId}/`, {
      params: memberParams(memberId)
    })
  },
}

export interface CreateUploadSessionRequest {
  file_name: string
  file_size: number
  media_type: string
  chunk_size?: number
  caption?: string
}

export interface UploadSession {
  id: string
  folder: string
  file_name: string
  file_size: number
  chunk_size: number
  total_chunks: number
  uploaded_chunks: number
  progress_percentage: number
  media_type: string
  caption: string
  status: string
  missing_chunks: number[]
  created_at: string
  completed_at: string | null
}

export const uploadApi = {
  // Create a chunked upload session for large files
  createSession: async (
    pickupId: string,
    folderId: string,
    data: CreateUploadSessionRequest,
    memberId?: string
  ): Promise<AxiosResponse<UploadSession>> => {
    return api.post(`/api/pickups/${pickupId}/folders/${folderId}/upload-sessions/`, data, {
      params: memberParams(memberId)
    })
  },

  // Get upload session details (with missing chunks for resumability)
  getSession: async (sessionId: string): Promise<AxiosResponse<UploadSession>> => {
    return api.get(`/api/upload-sessions/${sessionId}/`)
  },

  // Upload a single chunk
  uploadChunk: async (
    sessionId: string,
    chunkIndex: number,
    chunk: Blob,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
    memberId?: string
  ): Promise<AxiosResponse<UploadSession>> => {
    const formData = new FormData()
    formData.append('chunk_index', chunkIndex.toString())
    formData.append('chunk', new File([chunk], 'chunk'))
    if (memberId) {
      formData.append('member_id', memberId)
    }

    return api.post(`/api/upload-sessions/${sessionId}/chunks/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
        }
      },
    })
  },

  // Finalize upload session and create Media
  finalizeSession: async (
    sessionId: string,
    memberId?: string
  ): Promise<AxiosResponse<Media>> => {
    return api.post(`/api/upload-sessions/${sessionId}/finalize/`, null, {
      params: memberParams(memberId)
    })
  },
}

export const healthApi = {
  // Health check
  check: async (): Promise<AxiosResponse<{ status: string; message: string }>> => {
    return api.get('/api/health')
  },
}

export default api
