import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and network errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (!error.response) {
      // Network error
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username, password, email) =>
    api.post('/auth/register', { username, password, email }),
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (username, email) =>
    api.post('/auth/forgot-password', { username, email }),
  resetPassword: (token, password) =>
    api.post(`/auth/reset-password/${token}`, { password }),
};

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
};

export const filesAPI = {
  getFiles: (folderId) => {
    const params = folderId ? `?folderId=${folderId}` : '';
    return api.get(`/files${params}`);
  },
  uploadFile: (formData) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteFile: (id) => api.delete(`/files/${id}`),
  getFile: (id) => api.get(`/files/${id}`),
  getFileUrl: (id) => api.get(`/files/${id}/url`),
};

export default api;
