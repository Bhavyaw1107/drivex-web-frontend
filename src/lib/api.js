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

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  return '/api';
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
    api.post('/folders', { name, parentId }),
  getFolders: (parentId) =>
    api.get(parentId ? `/folders?parentId=${parentId}` : '/folders'),
  getFolder: (id) => api.get(`/folders/${id}`),
  getBreadcrumb: (id) => api.get(`/folders/${id}/breadcrumb`),
  renameFolder: (id, name) =>
    api.put(`/folders/${id}`, { name }),
  deleteFolder: (id) => api.delete(`/folders/${id}`),
  deleteFolderContents: (id) => api.delete(`/folders/${id}/contents`),
  moveFolder: (id, targetFolderId) =>
    api.put(`/folders/${id}/move`, { parentId: targetFolderId }),
  toggleStarFolder: (id) => api.patch(`/folders/${id}/star`),
  getStarredFolders: () => api.get('/folders/starred'),
  getRecentFolders: () => api.get('/folders/recent'),
  getTrashFolders: (parentId) =>
    api.get(parentId ? `/folders/trash?parentId=${parentId}` : '/folders/trash'),
  restoreFolder: (id) => api.patch(`/folders/${id}/restore`),
  emptyTrashFolders: () => api.delete('/folders/trash/empty'),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  promoteUser: (clerkId) => api.post(`/admin/promote/${clerkId}`),
};

export const filesAPI = {
  getFiles: (folderId) => {
    const params = folderId ? `?folderId=${folderId}` : '';
    return api.get(`/files${params}`);
  },
  uploadFile: (formData, onUploadProgress) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  deleteFile: (id) => api.delete(`/files/${id}`),
  getFile: (id) => api.get(`/files/${id}`),
  getFileUrl: (id) => api.get(`/files/${id}/url`),
  moveFile: (id, targetFolderId) =>
    api.put(`/files/${id}/move`, { folderId: targetFolderId }),
  toggleStarFile: (id) => api.patch(`/files/${id}/star`),
  getStarredFiles: () => api.get('/files/starred'),
  getRecentFiles: () => api.get('/files/recent'),
  getTrashFiles: (folderId) =>
    api.get(folderId ? `/files/trash?folderId=${folderId}` : '/files/trash'),
  restoreFile: (id) => api.patch(`/files/${id}/restore`),
  emptyTrashFiles: () => api.delete('/files/trash/empty'),
};

export default api;
