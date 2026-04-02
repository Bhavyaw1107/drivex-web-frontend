import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  LogOut,
  Cloud,
  Loader2,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
  MoreVertical,
  Pencil,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  Move,
  Info,
  Grid3X3,
  List,
  Clock,
  SortAsc,
  FileType,
  ExternalLink,
  Star,
  CheckSquare,
  Sparkles
} from 'lucide-react';

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

// Get icon color class based on mime type
function getIconColorClass(mimeType) {
  if (!mimeType) return 'text-neon-yellow'; // folder default
  if (mimeType.startsWith('image/')) return 'text-neon-pink';
  if (mimeType.startsWith('video/')) return 'text-neon-purple';
  if (mimeType.startsWith('audio/')) return 'text-neon-yellow';
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('docx'))
    return 'text-cyan-400';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar'))
    return 'text-neon-yellow';
  return 'text-cyan-400';
}

// Get icon gradient class
function getIconGradientClass(mimeType) {
  if (!mimeType) return 'icon-gradient-folder';
  if (mimeType.startsWith('image/')) return 'icon-gradient-image';
  if (mimeType.startsWith('video/')) return 'icon-gradient-video';
  if (mimeType.startsWith('audio/')) return 'icon-gradient-audio';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar'))
    return 'icon-gradient-archive';
  return 'icon-gradient-file';
}

// Check if item is a folder
function isItemFolder(item) {
  return !item.mimeType && item.name;
}

// Sort options
const SORT_OPTIONS = [
  { key: 'name', label: 'Name', icon: SortAsc },
  { key: 'date', label: 'Date modified', icon: Clock },
  { key: 'size', label: 'Size', icon: ArrowUpDown },
  { key: 'type', label: 'Type', icon: FileType },
];

// Sort items
function sortItems(items, sortBy, sortOrder) {
  return [...items].sort((a, b) => {
    let comparison = 0;
    const aName = (a.name || a.filename || '').toLowerCase();
    const bName = (b.name || b.filename || '').toLowerCase();

    if (sortBy === 'name') {
      comparison = aName.localeCompare(bName);
    } else if (sortBy === 'date') {
      comparison = new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'size') {
      comparison = (b.size || 0) - (a.size || 0);
    } else if (sortBy === 'type') {
      const aType = a.mimeType || 'folder';
      const bType = b.mimeType || 'folder';
      comparison = aType.localeCompare(bType);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

// Filter items by search
function filterItems(items, searchQuery) {
  if (!searchQuery.trim()) return items;
  const query = searchQuery.toLowerCase();
  return items.filter(item => {
    const name = (item.name || item.filename || '').toLowerCase();
    return name.includes(query);
  });
}

export default function Dashboard() {
  // State
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Drive' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [dragItem, setDragItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [moveDialog, setMoveDialog] = useState(null);
  const [allFolders, setAllFolders] = useState([]);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameDialog, setRenameDialog] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState(null);
  const [deleteFolderContents, setDeleteFolderContents] = useState(false);
  const [fileDetails, setFileDetails] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const fileInputRef = useRef(null);
  const sortRef = useRef(null);
  const menuRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, filesRes] = await Promise.all([
        foldersAPI.getFolders(currentFolderId),
        filesAPI.getFiles(currentFolderId)
      ]);
      setFolders(foldersRes.data.folders || []);
      setFiles(filesRes.data.files || []);
    } catch (err) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  // Fetch all folders for move dialog
  const fetchAllFolders = useCallback(async () => {
    try {
      const res = await foldersAPI.getFolders(null);
      setAllFolders(res.data.folders || []);
    } catch (err) {
      console.error('Failed to fetch folders');
    }
  }, []);

  // Fetch breadcrumb
  const fetchBreadcrumb = async (folderId) => {
    if (!folderId) {
      setBreadcrumbs([{ id: null, name: 'My Drive' }]);
      return;
    }
    try {
      const res = await foldersAPI.getBreadcrumb(folderId);
      setBreadcrumbs([
        { id: null, name: 'My Drive' },
        ...res.data.breadcrumb
      ]);
    } catch (err) {
      console.error('Failed to fetch breadcrumb');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle selection
  const toggleSelect = (item, e) => {
    e?.stopPropagation();
    const id = item._id || item.id;
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  // Select all - filter out invalid items
  const selectAll = () => {
    const allIds = sortedItems
      .filter(item => item && getItemId(item))
      .map(item => getItemId(item));
    setSelectedItems(allIds);
  };

  const clearSelection = () => setSelectedItems([]);

  // Navigation
  const navigateToFolder = async (folderId) => {
    setCurrentFolderId(folderId);
    await fetchBreadcrumb(folderId);
    clearSelection();
  };

  const navigateToRoot = () => {
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: 'My Drive' }]);
    clearSelection();
  };

  // Upload files
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
        setFiles(prev => [res.data.file, ...prev]);
        toast.success(`${file.name} uploaded`);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
  };

  // File handlers
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

  const openFile = async (fileId) => {
    try {
      const res = await filesAPI.getFileUrl(fileId);
      window.open(res.data.presignedUrl, '_blank');
    } catch (err) {
      toast.error('Failed to open file');
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await filesAPI.deleteFile(fileId);
      setFiles(prev => prev.filter(f => (f.id || f._id) !== fileId));
      setDeleteConfirm(null);
      toast.success('File deleted');
    } catch (err) {
      toast.error('Failed to delete file');
    }
  };

  // Folder operations
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await foldersAPI.createFolder(newFolderName.trim(), currentFolderId);
      setFolders(prev => [...prev, res.data]);
      setNewFolderDialog(false);
      setNewFolderName('');
      toast.success('Folder created');
    } catch (err) {
      toast.error('Failed to create folder');
    }
  };

  const renameFolder = async () => {
    if (!renameName.trim() || !renameDialog) return;
    try {
      const res = await foldersAPI.renameFolder(renameDialog._id || renameDialog.id, renameName.trim());
      setFolders(prev => prev.map(f => (f._id || f.id) === res.data._id ? res.data : f));
      setRenameDialog(null);
      setRenameName('');
      toast.success('Folder renamed');
    } catch (err) {
      toast.error('Failed to rename folder');
    }
  };

  const deleteFolder = async () => {
    if (!deleteFolderDialog) return;
    try {
      const folderId = deleteFolderDialog._id || deleteFolderDialog.id;
      if (deleteFolderContents) {
        await foldersAPI.deleteFolderContents(folderId);
        toast.success('Folder and contents deleted');
      } else {
        await foldersAPI.deleteFolder(folderId);
        toast.success('Folder deleted');
      }
      setFolders(prev => prev.filter(f => (f._id || f.id) !== folderId));
      setDeleteFolderDialog(null);
      setDeleteFolderContents(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete folder');
    }
  };

  // Move item
  const handleMove = async (item, targetFolderId) => {
    try {
      const itemId = item._id || item.id;
      const isFolder = isItemFolder(item);

      if (isFolder) {
        await foldersAPI.moveFolder(itemId, targetFolderId);
        setFolders(prev => prev.filter(f => (f._id || f.id) !== itemId));
      } else {
        await filesAPI.moveFile(itemId, targetFolderId);
        setFiles(prev => prev.filter(f => (f._id || f.id) !== itemId));
      }
      setMoveDialog(null);
      toast.success('Item moved successfully');
    } catch (err) {
      toast.error('Failed to move item');
    }
  };

  // Drag and drop between folders
  const handleItemDragStart = (item, e) => {
    setDragItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleItemDragEnd = () => {
    setDragItem(null);
    setDropTarget(null);
  };

  const handleFolderDragOver = (folderId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItem && (dragItem._id || dragItem.id) !== folderId) {
      setDropTarget(folderId);
    }
  };

  const handleFolderDragLeave = (e) => {
    e.stopPropagation();
    setDropTarget(null);
  };

  const handleFolderDrop = async (folderId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItem && (dragItem._id || dragItem.id) !== folderId) {
      await handleMove(dragItem, folderId);
    }
    setDragItem(null);
    setDropTarget(null);
  };

  // Computed values - filter out null/undefined items
  const allItems = [
    ...folders.filter(Boolean).map(f => ({ ...f, _id: f._id || f.id, isFolder: true })),
    ...files.filter(Boolean).map(f => ({ ...f, _id: f._id || f.id, isFolder: false }))
  ];

  const filteredItems = filterItems(allItems, searchQuery);
  const sortedItems = sortItems(filteredItems, sortBy, sortOrder);

  // DEBUG: Log data structure
  console.log('[DriveX] folders:', folders, 'files:', files, 'allItems:', allItems, 'sortedItems:', sortedItems);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Safe getItemId - handles null/undefined
  const getItemId = (item) => {
    if (!item) return null;
    return item._id || item.id || null;
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-gray-200 flex">
      {/* Sidebar - Water Glass Effect */}
      <aside className="w-64 fixed h-full z-20 water-sidebar">
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient-full flex items-center justify-center water-glow">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg gradient-text-full">DriveX</h1>
              <p className="text-[10px] text-gray-500">Cloud Storage</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={navigateToRoot}
            className={`nav-item w-full ${!currentFolderId ? 'active' : ''}`}
          >
            <Home className="w-5 h-5" />
            My Drive
          </button>

          <button className="nav-item w-full">
            <Star className="w-5 h-5" />
            Starred
          </button>

          <button className="nav-item w-full">
            <Clock className="w-5 h-5" />
            Recent
          </button>

          <button className="nav-item w-full">
            <Trash2 className="w-5 h-5" />
            Trash
          </button>
        </nav>

        {/* Upload Button in Sidebar */}
        <div className="p-4">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-brand-gradient-full hover:opacity-90 text-white border-0 gap-2 water-button"
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-gradient-full flex items-center justify-center text-white font-semibold text-sm">
              {user.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.username}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header - Water Glass */}
        <header className="sticky top-0 z-10 water-header">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-2xl water-search rounded-xl">
                <div className="flex items-center px-4">
                  <Search className="w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search files and folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-0 outline-none px-3 py-3 text-sm placeholder:text-gray-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-white/10 rounded">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center water-toggle rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 water-button rounded-lg text-sm hover:bg-white/10 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Sort
                </button>
                {sortDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 water-dropdown rounded-xl py-2 shadow-xl">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.key}
                        onClick={() => {
                          if (sortBy === option.key) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy(option.key);
                            setSortOrder('asc');
                          }
                          setSortDropdownOpen(false);
                        }}
                        className={`context-menu-item w-full ${sortBy === option.key ? 'bg-white/10' : ''}`}
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                        {sortBy === option.key && (
                          sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 ml-auto" /> : <ArrowDown className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6" onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop}>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={navigateToRoot} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
              <Home className="w-4 h-4" />
            </button>
            {breadcrumbs.slice(1).map((crumb, index) => (
              <span key={crumb.id || index} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <button
                  onClick={() => navigateToFolder(crumb.id)}
                  className="text-sm hover:text-white transition-colors"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {/* Selection bar */}
          {selectedItems.length > 0 && (
            <div className="water-selection rounded-xl p-4 mb-6 flex items-center gap-4">
              <button onClick={clearSelection} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium">{selectedItems.length} selected</span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-gray-300 hover:text-white hover:bg-white/10 gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMoveDialog({ items: selectedItems.map(id => allItems.find(i => (i._id || i.id) === id)).filter(Boolean) });
                  fetchAllFolders();
                }}
                className="text-gray-300 hover:text-white hover:bg-white/10 gap-2"
              >
                <Move className="w-4 h-4" />
                Move
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm({ bulk: true, ids: selectedItems })}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setNewFolderDialog(true)}
                variant="outline"
                className="water-button border-white/10 hover:bg-white/10 text-gray-200 gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                New Folder
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              {folders.length} folders, {files.length} files
            </div>
          </div>

          {/* Files & Folders */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
                <div className="absolute inset-0 w-10 h-10 rounded-full bg-cyan-400/20 animate-ping" />
              </div>
            </div>
          ) : sortedItems.length === 0 ? (
            /* Empty State - DriveX Branding */
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-3xl water-empty-icon flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-cyan-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-gradient-full flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold gradient-text-full mb-3">Welcome to DriveX</h3>
              <p className="text-gray-500 text-center max-w-md mb-8">
                Your personal cloud storage is ready. Upload files or create folders to get started.
              </p>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-brand-gradient-full hover:opacity-90 text-white border-0 gap-2 px-6"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Button>
                <Button
                  onClick={() => setNewFolderDialog(true)}
                  variant="outline"
                  className="water-button border-white/10 hover:bg-white/10 text-gray-200 gap-2 px-6"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Folder
                </Button>
              </div>
            </div>
          ) : dragActive ? (
            /* Drag Active State */
            <div className="water-dropzone rounded-2xl p-12 flex flex-col items-center justify-center border-2 border-dashed border-cyan-400/50">
              <div className="w-20 h-20 rounded-2xl bg-brand-gradient-full flex items-center justify-center mb-4 water-glow">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <p className="text-lg font-medium text-white">Drop files to upload</p>
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-cyan-400 mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortedItems.map((item, index) => {
                // Guard: skip null/undefined items
                if (!item) return null;

                const itemId = getItemId(item);
                // Fallback key if itemId is null
                const safeKey = itemId ?? `fallback-${index}`;
                const isSelected = itemId ? selectedItems.includes(itemId) : false;
                const isDragging = dragItem ? getItemId(dragItem) === itemId : false;
                const isDropTarget = itemId === dropTarget && isItemFolder(item);
                const itemIsFolder = isItemFolder(item);
                const isHovered = itemId === hoveredItem;

                return (
                  <div
                    key={safeKey}
                    draggable
                    onDragStart={(e) => handleItemDragStart(item, e)}
                    onDragEnd={handleItemDragEnd}
                    onDragOver={itemIsFolder ? (e) => handleFolderDragOver(itemId, e) : undefined}
                    onDragLeave={itemIsFolder ? (e) => handleFolderDragLeave(e) : undefined}
                    onDrop={itemIsFolder ? (e) => handleFolderDrop(itemId, e) : undefined}
                    onClick={() => itemIsFolder ? navigateToFolder(itemId) : openFile(itemId)}
                    onMouseEnter={() => setHoveredItem(itemId)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`water-card rounded-2xl p-4 cursor-pointer group relative transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''} ${isDropTarget ? 'ring-2 ring-cyan-400 scale-105' : ''} ${isSelected ? 'water-card-selected' : ''}`}
                  >
                    {/* Selection Checkbox - Only on hover */}
                    {isHovered && (
                      <div
                        onClick={(e) => toggleSelect(item, e)}
                        className="absolute top-3 left-3 z-10 transition-opacity"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-400 hover:border-cyan-400'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons - Only on hover */}
                    {isHovered && !isSelected && (
                      <div className="absolute top-3 right-3 z-10 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === itemId ? null : itemId); }}
                          className="p-1.5 rounded-lg water-action-btn"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Selected Actions */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-10 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === itemId ? null : itemId); }}
                          className="p-1.5 rounded-lg water-action-btn"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex flex-col items-center text-center pt-4">
                      <div className={`w-16 h-16 rounded-2xl ${getIconGradientClass(item.mimeType)} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                        {itemIsFolder ? (
                          <Folder className={`w-8 h-8 ${getIconColorClass(null)}`} />
                        ) : (
                          item.mimeType?.startsWith('image/') ? <Image className={`w-8 h-8 ${getIconColorClass(item.mimeType)}`} /> :
                          item.mimeType?.startsWith('video/') ? <Film className={`w-8 h-8 ${getIconColorClass(item.mimeType)}`} /> :
                          item.mimeType?.startsWith('audio/') ? <Music className={`w-8 h-8 ${getIconColorClass(item.mimeType)}`} /> :
                          item.mimeType?.includes('pdf') || item.mimeType?.includes('word') || item.mimeType?.includes('docx') ? <FileText className={`w-8 h-8 ${getIconColorClass(item.mimeType)}`} /> :
                          item.mimeType?.includes('zip') || item.mimeType?.includes('archive') ? <Archive className={`w-8 h-8 ${getIconColorClass(item.mimeType)}`} /> :
                          <File className={`w-8 h-8 ${getIconColorClass(item.mimeType)}`} />
                        )}
                      </div>
                      <p className="text-sm font-medium truncate w-full">{item.name || item.filename}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {itemIsFolder ? formatDate(item.createdAt) : `${formatFileSize(item.size)} • ${formatDate(item.createdAt)}`}
                      </p>
                    </div>

                    {/* Context Menu */}
                    {activeMenu === itemId && (
                      <div ref={menuRef} className="absolute top-12 right-3 z-30 w-48 water-dropdown rounded-xl py-2 shadow-xl">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }}
                          className="context-menu-item w-full"
                        >
                          <Info className="w-4 h-4" /> Info
                        </button>
                        {!itemIsFolder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openFile(itemId); setActiveMenu(null); }}
                            className="context-menu-item w-full"
                          >
                            <ExternalLink className="w-4 h-4" /> Open
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setMoveDialog({ items: [item] }); fetchAllFolders(); setActiveMenu(null); }}
                          className="context-menu-item w-full"
                        >
                          <Move className="w-4 h-4" /> Move
                        </button>
                        {itemIsFolder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenameDialog(item); setRenameName(item.name); setActiveMenu(null); }}
                            className="context-menu-item w-full"
                          >
                            <Pencil className="w-4 h-4" /> Rename
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (itemIsFolder) {
                              setDeleteFolderDialog(item);
                            } else {
                              setDeleteConfirm(item);
                            }
                            setActiveMenu(null);
                          }}
                          className="context-menu-item w-full text-red-400"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="water-card rounded-2xl overflow-hidden">
              {/* List Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 border-b border-white/5">
                <div className="col-span-1" />
                <div className="col-span-5 flex items-center gap-2">
                  <button onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' && sortBy === 'name' ? 'desc' : 'asc'); }} className="flex items-center gap-1 hover:text-white transition-colors">
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <button onClick={() => { setSortBy('size'); setSortOrder(sortOrder === 'asc' && sortBy === 'size' ? 'desc' : 'asc'); }} className="flex items-center gap-1 hover:text-white transition-colors">
                    Size {sortBy === 'size' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </div>
                <div className="col-span-3 flex items-center gap-1">
                  <button onClick={() => { setSortBy('date'); setSortOrder(sortOrder === 'asc' && sortBy === 'date' ? 'desc' : 'asc'); }} className="flex items-center gap-1 hover:text-white transition-colors">
                    Modified {sortBy === 'date' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </div>
                <div className="col-span-1" />
              </div>

              {/* List Items */}
              {sortedItems.map((item, index) => {
                // Guard: skip null/undefined items
                if (!item) return null;

                const itemId = getItemId(item);
                // Fallback key if itemId is null
                const safeKey = itemId ?? `fallback-list-${index}`;
                const isSelected = itemId ? selectedItems.includes(itemId) : false;
                const itemIsFolder = isItemFolder(item);
                const isHovered = itemId === hoveredItem;

                return (
                  <div
                    key={safeKey}
                    draggable
                    onDragStart={(e) => handleItemDragStart(item, e)}
                    onDragEnd={handleItemDragEnd}
                    onDragOver={itemIsFolder ? (e) => handleFolderDragOver(itemId, e) : undefined}
                    onDragLeave={itemIsFolder ? (e) => handleFolderDragLeave(e) : undefined}
                    onDrop={itemIsFolder ? (e) => handleFolderDrop(itemId, e) : undefined}
                    onClick={() => itemIsFolder ? navigateToFolder(itemId) : openFile(itemId)}
                    onMouseEnter={() => setHoveredItem(itemId)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`grid grid-cols-12 gap-4 px-6 py-3 items-center border-b border-white/5 cursor-pointer group transition-all ${isSelected ? 'water-item-selected' : 'hover:bg-white/5'} ${dropTarget === itemId && itemIsFolder ? 'ring-2 ring-cyan-400/50' : ''}`}
                  >
                    <div className="col-span-1">
                      {isHovered && (
                        <div onClick={(e) => toggleSelect(item, e)} className="cursor-pointer">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500 hover:border-cyan-400'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      )}
                      {!isHovered && isSelected && (
                        <div className="w-5 h-5 rounded border-2 bg-cyan-500 border-cyan-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="col-span-5 flex items-center gap-3">
                      {itemIsFolder ? (
                        <Folder className={`w-5 h-5 ${getIconColorClass(null)}`} />
                      ) : (
                        item.mimeType?.startsWith('image/') ? <Image className={`w-5 h-5 ${getIconColorClass(item.mimeType)}`} /> :
                        item.mimeType?.startsWith('video/') ? <Film className={`w-5 h-5 ${getIconColorClass(item.mimeType)}`} /> :
                        item.mimeType?.startsWith('audio/') ? <Music className={`w-5 h-5 ${getIconColorClass(item.mimeType)}`} /> :
                        item.mimeType?.includes('pdf') || item.mimeType?.includes('word') || item.mimeType?.includes('docx') ? <FileText className={`w-5 h-5 ${getIconColorClass(item.mimeType)}`} /> :
                        item.mimeType?.includes('zip') || item.mimeType?.includes('archive') ? <Archive className={`w-5 h-5 ${getIconColorClass(item.mimeType)}`} /> :
                        <File className={`w-5 h-5 ${getIconColorClass(item.mimeType)}`} />
                      )}
                      <span className="text-sm truncate">{item.name || item.filename}</span>
                    </div>
                    <div className="col-span-2 text-xs text-gray-500">
                      {itemIsFolder ? '—' : formatFileSize(item.size)}
                    </div>
                    <div className="col-span-3 text-xs text-gray-500">{formatDate(item.createdAt)}</div>
                    <div className="col-span-1 flex justify-end">
                      {isHovered && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === itemId ? null : itemId); }}
                          className="p-1.5 rounded-lg water-action-btn opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Context Menu */}
                    {activeMenu === itemId && (
                      <div ref={menuRef} className="absolute right-6 z-30 w-48 water-dropdown rounded-xl py-2 shadow-xl">
                        <button onClick={() => { setActiveMenu(null); }} className="context-menu-item w-full"><Info className="w-4 h-4" /> Info</button>
                        {!itemIsFolder && <button onClick={() => { openFile(itemId); setActiveMenu(null); }} className="context-menu-item w-full"><ExternalLink className="w-4 h-4" /> Open</button>}
                        <button onClick={() => { setMoveDialog({ items: [item] }); fetchAllFolders(); setActiveMenu(null); }} className="context-menu-item w-full"><Move className="w-4 h-4" /> Move</button>
                        {itemIsFolder && <button onClick={() => { setRenameDialog(item); setRenameName(item.name); setActiveMenu(null); }} className="context-menu-item w-full"><Pencil className="w-4 h-4" /> Rename</button>}
                        <button onClick={() => { if (itemIsFolder) setDeleteFolderDialog(item); else setDeleteConfirm(item); setActiveMenu(null); }} className="context-menu-item w-full text-red-400"><Trash2 className="w-4 h-4" /> Delete</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* New Folder Dialog */}
      {newFolderDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="water-dialog rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Folder</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-4 py-3 rounded-xl water-input outline-none text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => setNewFolderDialog(false)} className="water-button">Cancel</Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim()} className="bg-brand-gradient-full hover:opacity-90 text-white border-0">Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {renameDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="water-dialog rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Rename Folder</h2>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="New name"
              className="w-full px-4 py-3 rounded-xl water-input outline-none text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && renameFolder()}
            />
            <div className="flex gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => setRenameDialog(null)} className="water-button">Cancel</Button>
              <Button onClick={renameFolder} disabled={!renameName.trim()} className="bg-brand-gradient-full hover:opacity-90 text-white border-0">Rename</Button>
            </div>
          </div>
        </div>
      )}

      {/* Move Dialog */}
      {moveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="water-dialog rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Move to...</h2>
            <div className="max-h-64 overflow-y-auto space-y-1">
              <button
                onClick={() => moveDialog.items.forEach(item => handleMove(item, null))}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-left transition-colors"
              >
                <Home className="w-5 h-5 text-gray-400" />
                <span className="text-sm">My Drive (Root)</span>
              </button>
              {allFolders.map(folder => (
                <button
                  key={folder._id || folder.id}
                  onClick={() => moveDialog.items.forEach(item => handleMove(item, folder._id || folder.id))}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-left transition-colors"
                >
                  <Folder className="w-5 h-5 text-neon-yellow" />
                  <span className="text-sm">{folder.name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => setMoveDialog(null)} className="water-button">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Dialog */}
      {deleteFolderDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="water-dialog rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Delete Folder</h2>
            <p className="text-gray-400 text-sm mb-4">
              Are you sure you want to delete "{deleteFolderDialog.name}"?
            </p>
            <label className="flex items-center gap-2 text-sm mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteFolderContents}
                onChange={(e) => setDeleteFolderContents(e.target.checked)}
                className="rounded border-gray-600 bg-white/5"
              />
              Also delete contents
            </label>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteFolderDialog(null)} className="water-button">Cancel</Button>
              <Button variant="destructive" onClick={deleteFolder} className="bg-red-600 hover:bg-red-700 text-white border-0">Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="water-dialog rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Delete File</h2>
            <p className="text-gray-400 text-sm mb-6">
              {deleteConfirm.bulk
                ? `Delete ${deleteConfirm.ids.length} selected items?`
                : `Are you sure you want to delete "${deleteConfirm.filename}"?`
              }
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="water-button">Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm.bulk) {
                    deleteConfirm.ids.forEach(id => {
                      const item = allItems.find(i => (i._id || i.id) === id);
                      if (item) {
                        if (isItemFolder(item)) {
                          foldersAPI.deleteFolder(id);
                          setFolders(prev => prev.filter(f => (f._id || f.id) !== id));
                        } else {
                          filesAPI.deleteFile(id);
                          setFiles(prev => prev.filter(f => (f._id || f.id) !== id));
                        }
                      }
                    });
                    setSelectedItems([]);
                  } else {
                    handleDeleteFile(deleteConfirm._id || deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Details */}
      {fileDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="water-dialog rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${getIconGradientClass(fileDetails.mimeType)} flex items-center justify-center`}>
                  {fileDetails.mimeType?.startsWith('image/') ? <Image className={`w-7 h-7 ${getIconColorClass(fileDetails.mimeType)}`} /> :
                   fileDetails.mimeType?.startsWith('video/') ? <Film className={`w-7 h-7 ${getIconColorClass(fileDetails.mimeType)}`} /> :
                   fileDetails.mimeType?.startsWith('audio/') ? <Music className={`w-7 h-7 ${getIconColorClass(fileDetails.mimeType)}`} /> :
                   fileDetails.mimeType?.includes('pdf') || fileDetails.mimeType?.includes('word') ? <FileText className={`w-7 h-7 ${getIconColorClass(fileDetails.mimeType)}`} /> :
                   <File className={`w-7 h-7 ${getIconColorClass(fileDetails.mimeType)}`} />}
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{fileDetails.filename || fileDetails.name}</h2>
                  <p className="text-sm text-gray-500">{fileDetails.mimeType || 'Folder'}</p>
                </div>
              </div>
              <button onClick={() => setFileDetails(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">Size</span>
                <span>{fileDetails.size ? formatFileSize(fileDetails.size) : '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">Created</span>
                <span>{formatDate(fileDetails.createdAt)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">Modified</span>
                <span>{formatDate(fileDetails.updatedAt || fileDetails.createdAt)}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {!isItemFolder(fileDetails) && (
                <Button onClick={() => openFile(fileDetails._id || fileDetails.id)} className="flex-1 bg-brand-gradient-full hover:opacity-90 text-white border-0 gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open
                </Button>
              )}
              <Button variant="outline" onClick={() => setFileDetails(null)} className="water-button">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
