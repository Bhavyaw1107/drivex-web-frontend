import { useCallback, useRef } from 'react';
import { useUpload as useUploadContext } from '../context/UploadContext';
import { filesAPI } from '../lib/api';
import { toast } from 'sonner';

// Format bytes per second to human readable
function formatSpeed(bytesPerSecond) {
  if (bytesPerSecond === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format milliseconds to human readable ETA
function formatEta(ms) {
  if (!ms || ms === Infinity || isNaN(ms)) return '—';
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function useUpload() {
  const { addUpload, updateUpload, removeUpload } = useUploadContext();
  const uploadStartTimeRef = useRef({});
  const uploadedBytesRef = useRef({});

  const uploadFile = useCallback(async (file, folderId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId);
    }

    const uploadId = addUpload(file);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      uploadStartTimeRef.current[uploadId] = startTime;
      uploadedBytesRef.current[uploadId] = 0;

      filesAPI.uploadFile(formData, (progressEvent) => {
        const { loaded, total } = progressEvent;
        const currentTime = Date.now();
        const timeDiff = (currentTime - startTime) / 1000;

        const bytesPerSecond = timeDiff > 0 ? loaded / timeDiff : 0;
        const remainingBytes = total - loaded;
        const eta = bytesPerSecond > 0 ? (remainingBytes / bytesPerSecond) * 1000 : null;

        uploadedBytesRef.current[uploadId] = loaded;

        updateUpload(uploadId, {
          progress: total > 0 ? Math.round((loaded / total) * 100) : 0,
          speed: formatSpeed(bytesPerSecond),
          eta: formatEta(eta),
          status: 'uploading',
        });
      })
        .then((res) => {
          updateUpload(uploadId, {
            progress: 100,
            status: 'completed',
            speed: formatSpeed(
              uploadedBytesRef.current[uploadId] /
              ((Date.now() - startTime) / 1000)
            ),
          });
          resolve(res.data.file);
        })
        .catch((error) => {
          updateUpload(uploadId, {
            status: 'error',
            error: error.message || 'Upload failed',
          });
          reject(error);
        });
    });
  }, [addUpload, updateUpload]);

  const uploadFiles = useCallback(async (files, folderId = null, maxConcurrent = 5) => {
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = Array.from(files).slice(i, i + maxConcurrent);
      const batchPromises = batch.map(file => uploadFile(file, folderId));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            file: batch[index].name,
            error: result.reason?.message || 'Upload failed'
          });
        }
      });
    }

    if (errors.length > 0) {
      toast.error(`${errors.length} file(s) failed to upload`);
    }

    return { results, errors };
  }, [uploadFile]);

  const retryUpload = useCallback(async (file, folderId = null) => {
    return uploadFile(file, folderId);
  }, [uploadFile]);

  return {
    uploadFile,
    uploadFiles,
    retryUpload,
  };
}