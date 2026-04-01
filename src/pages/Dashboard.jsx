import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { filesAPI, foldersAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  Upload,
  File,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Trash2,
  Download,
  LogOut,
  Cloud,
  Loader2,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
  MoreVertical,
  Pencil,
  FolderInput,
  X
} from 'lucide-react';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive;
  return File;
}

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Root' }]);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLoading, setNewFolderLoading] = useState(false);
  const [renameDialog, setRenameDialog] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState(null);
  const [deleteFolderContents, setDeleteFolderContents] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [foldersRes, filesRes] = await Promise.all([
        foldersAPI.getFolders(currentFolderId),
        filesAPI.getFiles(currentFolderId)
      ]);
      setFolders(foldersRes.data.folders || []);
      setFiles(filesRes.data.files || []);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBreadcrumb = async (folderId) => {
    if (!folderId) {
      setBreadcrumbs([{ id: null, name: 'Root' }]);
      return;
    }
    try {
      const res = await foldersAPI.getBreadcrumb(folderId);
      setBreadcrumbs([
        { id: null, name: 'Root' },
        ...res.data.breadcrumb
      ]);
    } catch (err) {
      console.error('Failed to fetch breadcrumb');
    }
  };

  const handleFileSelect = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    await uploadFiles(fileList);
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;
    await uploadFiles(fileList);
  };

  const uploadFiles = async (fileList) => {
    setUploading(true);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

      try {
        const res = await filesAPI.uploadFile(formData);
        setFiles((prev) => [res.data.file, ...prev]);
        toast.success(`${file.name} uploaded successfully`);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
  };

  const handleDelete = async (fileId, filename) => {
    try {
      await filesAPI.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setDeleteConfirm(null);
      toast.success(`${filename} deleted successfully`);
    } catch (err) {
      toast.error('Failed to delete file');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const openFile = async (fileId) => {
    try {
      const res = await filesAPI.getFileUrl(fileId);
      window.open(res.data.presignedUrl, '_blank');
    } catch (err) {
      toast.error('Failed to open file');
    }
  };

  const navigateToFolder = async (folderId) => {
    setCurrentFolderId(folderId);
    await fetchBreadcrumb(folderId);
  };

  const navigateToRoot = () => {
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: 'Root' }]);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setNewFolderLoading(true);
    try {
      const res = await foldersAPI.createFolder(newFolderName.trim(), currentFolderId);
      setFolders((prev) => [...prev, res.data]);
      setNewFolderDialog(false);
      setNewFolderName('');
      toast.success('Folder created successfully');
    } catch (err) {
      toast.error('Failed to create folder');
    } finally {
      setNewFolderLoading(false);
    }
  };

  const renameFolder = async () => {
    if (!renameName.trim() || !renameDialog) return;
    setRenameLoading(true);
    try {
      const res = await foldersAPI.renameFolder(renameDialog.id, renameName.trim());
      setFolders((prev) =>
        prev.map((f) => (f.id === res.data.id ? res.data : f))
      );
      setRenameDialog(null);
      setRenameName('');
      toast.success('Folder renamed successfully');
    } catch (err) {
      toast.error('Failed to rename folder');
    } finally {
      setRenameLoading(false);
    }
  };

  const deleteFolder = async () => {
    if (!deleteFolderDialog) return;
    try {
      if (deleteFolderContents) {
        await foldersAPI.deleteFolderContents(deleteFolderDialog.id);
        toast.success('Folder and contents deleted');
      } else {
        await foldersAPI.deleteFolder(deleteFolderDialog.id);
        toast.success('Folder deleted');
      }
      setFolders((prev) => prev.filter((f) => f.id !== deleteFolderDialog.id));
      setDeleteFolderDialog(null);
      setDeleteFolderContents(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete folder');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">DriveX</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              Welcome, {user.username}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <button
            onClick={navigateToRoot}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Home className="h-4 w-4" />
            Root
          </button>
          {breadcrumbs.slice(1).map((crumb, index) => (
            <span key={crumb.id || 'folder'} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => navigateToFolder(crumb.id)}
                className="text-primary hover:underline"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        {/* Upload Area */}
        <Card
          className={`mb-6 transition-colors ${
            dragActive ? 'border-primary bg-blue-50' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Drag and drop files here</p>
                <p className="text-sm text-gray-500 mt-1">
                  or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary hover:underline"
                  >
                    browse files
                  </button>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => setNewFolderDialog(true)} variant="outline" size="sm">
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            {folders.length} folders, {files.length} files
          </div>
        </div>

        {/* Files & Folders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Contents
              <Badge variant="secondary" className="ml-2">
                {folders.length + files.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : folders.length === 0 && files.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>This folder is empty. Upload files or create a folder!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Folder className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigateToFolder(folder.id)}
                    >
                      <p className="font-medium truncate hover:text-primary">
                        {folder.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Folder</span>
                        <span>•</span>
                        <span>{formatDate(folder.createdAt)}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === folder.id ? null : folder.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {activeMenu === folder.id && (
                        <div className="absolute right-0 top-8 z-10 w-40 bg-white rounded-lg shadow-lg border py-1">
                          <button
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameDialog(folder);
                              setRenameName(folder.name);
                              setActiveMenu(null);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Rename
                          </button>
                          <button
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteFolderDialog(folder);
                              setActiveMenu(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Files */}
                {files.map((file) => {
                  const FileIcon = getFileIcon(file.mimeType);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => openFile(file.id)}
                      >
                        <p className="font-medium truncate hover:text-primary">
                          {file.filename}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openFile(file.id)}
                          title="Open file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(file)}
                          title="Delete file"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* New Folder Dialog */}
      {newFolderDialog && (
        <Dialog open onOpenChange={setNewFolderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="folderName">Folder name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewFolderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim() || newFolderLoading}>
                {newFolderLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rename Folder Dialog */}
      {renameDialog && (
        <Dialog open onOpenChange={() => setRenameDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="renameName">New name</Label>
              <Input
                id="renameName"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Enter new name"
                onKeyDown={(e) => e.key === 'Enter' && renameFolder()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialog(null)}>
                Cancel
              </Button>
              <Button onClick={renameFolder} disabled={!renameName.trim() || renameLoading}>
                {renameLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Folder Dialog */}
      {deleteFolderDialog && (
        <Dialog open onOpenChange={() => setDeleteFolderDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                Are you sure you want to delete "{deleteFolderDialog.name}"?
              </p>
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deleteContents"
                  checked={deleteFolderContents}
                  onChange={(e) => setDeleteFolderContents(e.target.checked)}
                />
                <Label htmlFor="deleteContents">
                  Also delete all contents (files and subfolders)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteFolderDialog(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteFolder}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete File Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete File</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{deleteConfirm.filename}"? This
                action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.filename)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
