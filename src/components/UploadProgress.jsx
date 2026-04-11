import { useUpload } from '../context/UploadContext';
import { X, CheckCircle, AlertCircle, Loader2, FileIcon } from 'lucide-react';
import { Button } from './ui/button';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function UploadProgress() {
  const { uploads, removeUpload, clearCompleted } = useUpload();

  if (uploads.length === 0) return null;

  const activeUploads = uploads.filter(u => u.status === 'pending' || u.status === 'uploading');
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const errorUploads = uploads.filter(u => u.status === 'error');

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      {activeUploads.length > 0 && (
        <div className="water-dropdown rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Uploading {activeUploads.length} file(s)</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {activeUploads.map(upload => (
              <div key={upload.id} className="px-4 py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <FileIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white">{upload.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-cyan-400">{upload.progress}%</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-400">{upload.speed}</span>
                      {upload.eta && (
                        <>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400">{upload.eta}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-gradient-full rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeUpload(upload.id)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorUploads.length > 0 && (
        <div className="water-dropdown rounded-xl overflow-hidden border border-red-500/30">
          <div className="px-4 py-3 border-b border-white/10 bg-red-500/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">{errorUploads.length} failed</span>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {errorUploads.map(upload => (
              <div key={upload.id} className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <FileIcon className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">{upload.name}</p>
                  <p className="text-xs text-red-400">{upload.error}</p>
                </div>
                <button
                  onClick={() => removeUpload(upload.id)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedUploads.length > 0 && activeUploads.length === 0 && errorUploads.length === 0 && (
        <div className="water-dropdown rounded-xl overflow-hidden border border-green-500/30">
          <div className="px-4 py-3 border-b border-white/10 bg-green-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">{completedUploads.length} uploaded</span>
            </div>
          </div>
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{completedUploads.length} file(s) ready</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearCompleted}
                className="text-xs text-gray-400 hover:text-white h-auto py-1 px-2"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
