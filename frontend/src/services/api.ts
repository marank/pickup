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
  // Django's CSRF cookie/header names.
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json',
  },
})

const SAFE_METHODS = ['get', 'head', 'options']
const hasCsrfCookie = () => document.cookie.split('; ').some((c) => c.startsWith('csrftoken='))

// Every unsafe request needs Django's CSRF token; fetch the cookie once before the first one.
// Axios then copies it into the X-CSRFToken header (same origin).
api.interceptors.request.use(async (config) => {
  if (!SAFE_METHODS.includes((config.method ?? 'get').toLowerCase()) && !hasCsrfCookie()) {
    await axios.get('/api/csrf')
  }
  return config
})

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

export const pickupApi = {
  // Create a new pickup
  createPickup: async (data: CreatePickupRequest): Promise<AxiosResponse<Pickup>> => {
    return api.post('/create-pickup/', data)
  },

  // Get pickup details 
  getPickup: async (id: string): Promise<AxiosResponse<Pickup>> => {
    return api.get(`/api/pickups/${id}/`)
  },

  // Log this browser in as a member, using the access key from a personal link
  enterSession: async (id: string, accessKey: string): Promise<AxiosResponse<Pickup>> => {
    return api.post(`/api/pickups/${id}/session/`, { access_key: accessKey })
  },

  // Leave the pickup in this browser
  leaveSession: async (id: string): Promise<AxiosResponse<void>> => {
    return api.delete(`/api/pickups/${id}/session/`)
  },

  // Join a pickup (creates folder and member, logs this browser in)
  joinPickup: async (id: string, data: CreateFolderRequest): Promise<AxiosResponse<JoinPickupResponse>> => {
    return api.post(`/api/pickups/${id}/join/`, data)
  },

  // Get all folders in a pickup 
  getFolders: async (id: string): Promise<AxiosResponse<Folder[]>> => {
    return api.get(`/api/pickups/${id}/folders/`)
  },

  // Get all media in a pickup 
  getAllMedia: async (id: string): Promise<AxiosResponse<Media[]>> => {
    return api.get(`/api/pickups/${id}/media/`)
  },
}

export const folderApi = {
  // Get folder details
  getFolder: async (
    pickupId: string,
    folderId: string
  ): Promise<AxiosResponse<Folder>> => {
    return api.get(`/api/pickups/${pickupId}/folders/${folderId}/`)
  },

  // Get media in a folder
  getMedia: async (
    pickupId: string,
    folderId: string
  ): Promise<AxiosResponse<Media[]>> => {
    return api.get(`/api/pickups/${pickupId}/folders/${folderId}/media/`)
  },

  // Upload media to a folder
  uploadMedia: async (
    pickupId: string,
    folderId: string,
    data: UploadMediaRequest,
    signal?: AbortSignal
  ): Promise<AxiosResponse<Media>> => {
    const formData = new FormData()
    formData.append('file', data.file)
    if (data.caption) {
      formData.append('caption', data.caption)
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
    folderId: string
  ): Promise<AxiosResponse<{ message: string }>> => {
    return api.delete(`/api/pickups/${pickupId}/folders/${folderId}/clear/`)
  },
}

export const mediaApi = {
  // Update media caption
  updateCaption: async (
    pickupId: string,
    folderId: string,
    mediaId: string,
    caption: string
  ): Promise<AxiosResponse<Media>> => {
    return api.patch(`/api/pickups/${pickupId}/folders/${folderId}/media/${mediaId}/caption/`, {
      caption,
    })
  },

  // Delete media
  deleteMedia: async (
    pickupId: string,
    folderId: string,
    mediaId: string
  ): Promise<AxiosResponse<void>> => {
    return api.delete(`/api/pickups/${pickupId}/folders/${folderId}/media/${mediaId}/`)
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
    data: CreateUploadSessionRequest
  ): Promise<AxiosResponse<UploadSession>> => {
    return api.post(`/api/pickups/${pickupId}/folders/${folderId}/upload-sessions/`, data)
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
    signal?: AbortSignal
  ): Promise<AxiosResponse<UploadSession>> => {
    const formData = new FormData()
    formData.append('chunk_index', chunkIndex.toString())
    formData.append('chunk', new File([chunk], 'chunk'))

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
    sessionId: string
  ): Promise<AxiosResponse<Media>> => {
    return api.post(`/api/upload-sessions/${sessionId}/finalize/`, null)
  },
}

export const healthApi = {
  // Health check
  check: async (): Promise<AxiosResponse<{ status: string }>> => {
    return api.get('/api/health')
  },
}

export default api
