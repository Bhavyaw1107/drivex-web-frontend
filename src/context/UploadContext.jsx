import { createContext, useContext, useState, useCallback } from 'react';

const UploadContext = createContext(null);

export function UploadProvider({ children }) {
  const [uploads, setUploads] = useState([]);

  const addUpload = useCallback((file, fileId) => {
    const uploadItem = {
      id: fileId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      eta: null,
      status: 'pending', // pending, uploading, completed, error
      error: null,
    };
    setUploads(prev => [...prev, uploadItem]);
    return uploadItem.id;
  }, []);

  const updateUpload = useCallback((id, updates) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.id === id ? { ...upload, ...updates } : upload
      )
    );
  }, []);

  const removeUpload = useCallback((id) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(upload => upload.status !== 'completed'));
  }, []);

  const getActiveUploads = useCallback(() => {
    return uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
  }, [uploads]);

  const getUploadStats = useCallback(() => {
    const active = uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
    const completed = uploads.filter(u => u.status === 'completed').length;
    const errors = uploads.filter(u => u.status === 'error').length;
    const totalBytes = uploads.reduce((sum, u) => sum + u.size, 0);
    const uploadedBytes = uploads.reduce((sum, u) => sum + (u.size * u.progress / 100), 0);
    return {
      activeCount: active.length,
      completedCount: completed,
      errorCount: errors,
      totalBytes,
      uploadedBytes,
      totalProgress: totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0,
    };
  }, [uploads]);

  return (
    <UploadContext.Provider value={{
      uploads,
      addUpload,
      updateUpload,
      removeUpload,
      clearCompleted,
      getActiveUploads,
      getUploadStats,
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
