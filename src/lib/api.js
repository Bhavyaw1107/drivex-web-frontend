import axios from 'axios';
import { toast } from 'sonner';

let clerkToken = null;
let clerkTokenGetter = null;

export const setClerkToken = (token) => {
  clerkToken = token;
};

export const setClerkTokenGetter = (getter) => {
  clerkTokenGetter = getter;
};

const resolveApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (!configuredUrl) {
    throw new Error('VITE_API_URL is not configured');
  }
  return configuredUrl.replace(/\/+$/, '');
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  let token = clerkToken;

  if (clerkTokenGetter) {
    try {
      token = await clerkTokenGetter();
      clerkToken = token ?? null;
    } catch (error) {
      clerkToken = null;
      token = null;
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      toast.error('Your session expired. Please sign in again.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

export const foldersAPI = {
  createFolder: (name, parentId) =>
    api.post('/api/folders', { name, parentId }),
  getFolders: (parentId) =>
    api.get(parentId ? `/api/folders?parentId=${parentId}` : '/api/folders'),
  getFolder: (id) => api.get(`/api/folders/${id}`),
  getBreadcrumb: (id) => api.get(`/api/folders/${id}/breadcrumb`),
  renameFolder: (id, name) =>
    api.put(`/api/folders/${id}`, { name }),
  deleteFolder: (id) => api.delete(`/api/folders/${id}`),
  deleteFolderContents: (id) => api.delete(`/api/folders/${id}/contents`),
  moveFolder: (id, targetFolderId) =>
    api.put(`/api/folders/${id}/move`, { parentId: targetFolderId }),
  toggleStarFolder: (id) => api.patch(`/api/folders/${id}/star`),
  getStarredFolders: () => api.get('/api/folders/starred'),
  getRecentFolders: () => api.get('/api/folders/recent'),
  getTrashFolders: (parentId) =>
    api.get(parentId ? `/api/folders/trash?parentId=${parentId}` : '/api/folders/trash'),
  restoreFolder: (id) => api.patch(`/api/folders/${id}/restore`),
  emptyTrashFolders: () => api.delete('/api/folders/trash/empty'),
};

export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  getUsers: () => api.get('/api/admin/users'),
  promoteUser: (clerkId) => api.post(`/api/admin/promote/${clerkId}`),
};

export const filesAPI = {
  getFiles: (folderId) => {
    const params = folderId ? `?folderId=${folderId}` : '';
    return api.get(`/api/files${params}`);
  },
  uploadFile: (formData, onUploadProgress) =>
    api.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  deleteFile: (id) => api.delete(`/api/files/${id}`),
  getFile: (id) => api.get(`/api/files/${id}`),
  getFileUrl: (id) => api.get(`/api/files/${id}/url`),
  moveFile: (id, targetFolderId) =>
    api.put(`/api/files/${id}/move`, { folderId: targetFolderId }),
  toggleStarFile: (id) => api.patch(`/api/files/${id}/star`),
  getStarredFiles: () => api.get('/api/files/starred'),
  getRecentFiles: () => api.get('/api/files/recent'),
  getTrashFiles: (folderId) =>
    api.get(folderId ? `/api/files/trash?folderId=${folderId}` : '/api/files/trash'),
  restoreFile: (id) => api.patch(`/api/files/${id}/restore`),
  emptyTrashFiles: () => api.delete('/api/files/trash/empty'),
};

export default api;
