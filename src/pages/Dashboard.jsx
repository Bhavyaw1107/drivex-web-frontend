import { useState, useEffect, useRef, useCallback } from "react";
import { useUser, SignOutButton } from "@clerk/clerk-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { filesAPI, foldersAPI } from "@/lib/api";
import { useUpload as useUploadContext } from "@/context/UploadContext";
import { useUpload as useUploadHook } from "@/hooks/useUpload";
import { toast } from "sonner";
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
  Sparkles,
  RotateCcw,
} from "lucide-react";

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// Get icon color class based on mime type
function getIconColorClass(mimeType) {
  if (!mimeType) return "text-neon-yellow";
  if (mimeType.startsWith("image/")) return "text-neon-pink";
  if (mimeType.startsWith("video/")) return "text-neon-purple";
  if (mimeType.startsWith("audio/")) return "text-neon-yellow";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("docx")
  )
    return "text-cyan-400";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("archive") ||
    mimeType.includes("rar")
  )
    return "text-neon-yellow";
  return "text-cyan-400";
}

// Get icon gradient class
function getIconGradientClass(mimeType) {
  if (!mimeType) return "icon-gradient-folder";
  if (mimeType.startsWith("image/")) return "icon-gradient-image";
  if (mimeType.startsWith("video/")) return "icon-gradient-video";
  if (mimeType.startsWith("audio/")) return "icon-gradient-audio";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("archive") ||
    mimeType.includes("rar")
  )
    return "icon-gradient-archive";
  return "icon-gradient-file";
}

// Check if item is a folder
function isItemFolder(item) {
  return !item.mimeType && item.name;
}

// Sort options
const SORT_OPTIONS = [
  { key: "name", label: "Name", icon: SortAsc },
  { key: "date", label: "Date modified", icon: Clock },
  { key: "size", label: "Size", icon: ArrowUpDown },
  { key: "type", label: "Type", icon: FileType },
];

// Sort items
function sortItems(items, sortBy, sortOrder) {
  return [...items].sort((a, b) => {
    let comparison = 0;
    const aName = (a.name || a.filename || "").toLowerCase();
    const bName = (b.name || b.filename || "").toLowerCase();

    if (sortBy === "name") {
      comparison = aName.localeCompare(bName);
    } else if (sortBy === "date") {
      comparison = new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === "size") {
      comparison = (b.size || 0) - (a.size || 0);
    } else if (sortBy === "type") {
      const aType = a.mimeType || "folder";
      const bType = b.mimeType || "folder";
      comparison = aType.localeCompare(bType);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });
}

// Filter items by search
function filterItems(items, searchQuery) {
  if (!searchQuery.trim()) return items;
  const query = searchQuery.toLowerCase();
  return items.filter((item) => {
    const name = (item.name || item.filename || "").toLowerCase();
    return name.includes(query);
  });
}

export default function Dashboard() {
  // State
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([
    { id: null, name: "My Drive" },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [viewMode, setViewMode] = useState("grid");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [dragItem, setDragItem] = useState(null);
  const [dragItems, setDragItems] = useState([]);
  const [dropTarget, setDropTarget] = useState(null);
  const [moveDialog, setMoveDialog] = useState(null);
  const [allFolders, setAllFolders] = useState([]);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameDialog, setRenameDialog] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState(null);
  const [deleteFolderContents, setDeleteFolderContents] = useState(false);
  const [fileDetails, setFileDetails] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [movingItems, setMovingItems] = useState(false);
  // View state: 'drive' | 'starred' | 'recent' | 'trash'
  const [currentView, setCurrentView] = useState('drive');

  const fileInputRef = useRef(null);
  const sortRef = useRef(null);
  const menuRef = useRef(null);
  const dragCounterRef = useRef(0);
  const { user } = useUser();

  const { uploadFiles: uploadFilesWithProgress } = useUploadHook();
  const { uploads } = useUploadContext();

  const isExternalFileDrag = (event) => {
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes("Files");
  };

  // Fetch data based on current view
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFiles([]);
    setFolders([]);
    try {
      if (currentView === 'starred') {
        const [foldersRes, filesRes] = await Promise.all([
          foldersAPI.getStarredFolders(),
          filesAPI.getStarredFiles(),
        ]);
        setFolders(foldersRes.data.folders || []);
        setFiles(filesRes.data.files || []);
      } else if (currentView === 'recent') {
        const [foldersRes, filesRes] = await Promise.all([
          foldersAPI.getRecentFolders(),
          filesAPI.getRecentFiles(),
        ]);
        setFolders(foldersRes.data.folders || []);
        setFiles(filesRes.data.files || []);
      } else if (currentView === 'trash') {
        const [foldersRes, filesRes] = await Promise.all([
          foldersAPI.getTrashFolders(currentFolderId),
          filesAPI.getTrashFiles(currentFolderId),
        ]);
        setFolders(foldersRes.data.folders || []);
        setFiles(filesRes.data.files || []);
      } else {
        const [foldersRes, filesRes] = await Promise.all([
          foldersAPI.getFolders(currentFolderId),
          filesAPI.getFiles(currentFolderId),
        ]);
        setFolders(foldersRes.data.folders || []);
        setFiles(filesRes.data.files || []);
      }
    } catch (err) {
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, currentView]);

  // Fetch all folders for move dialog
  const fetchAllFolders = useCallback(async () => {
    try {
      const res = await foldersAPI.getFolders(null);
      setAllFolders(res.data.folders || []);
    } catch (err) {
      toast.error("Failed to fetch folders");
    }
  }, []);

  // Fetch breadcrumb
  const fetchBreadcrumb = async (folderId) => {
    const rootLabel = currentView === "trash" ? "Trash" : "My Drive";

    if (!folderId) {
      setBreadcrumbs([{ id: null, name: rootLabel }]);
      return;
    }
    try {
      const res = await foldersAPI.getBreadcrumb(folderId);
      setBreadcrumbs([{ id: null, name: rootLabel }, ...res.data.breadcrumb]);
    } catch (err) {
      toast.error("Failed to fetch breadcrumb");
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle view change
  const handleViewChange = (view) => {
    setCurrentView(view);
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: view === "trash" ? "Trash" : "My Drive" }]);
    setSearchQuery("");
    clearSelection();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
      if (!e.target.closest(".item-menu") && !e.target.closest(".menu-toggle")) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle selection
  const toggleSelect = (item, e) => {
    e?.stopPropagation();
    const id = item.id;
    setSelectedItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      return [...prev, id];
    });
  };

  // Select all
  const selectAll = () => {
    const allIds = sortedItems
      .filter((item) => item && item.id)
      .map((item) => item.id);
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
    setBreadcrumbs([{ id: null, name: currentView === "trash" ? "Trash" : "My Drive" }]);
    clearSelection();
  };

  // Upload files with progress tracking
  const handleFileUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    try {
      const { results, errors } = await uploadFilesWithProgress(
        Array.from(fileList),
        currentFolderId
      );
      results.forEach((file) => {
        setFiles((prev) => [file, ...prev]);
      });
      if (results.length > 0) {
        toast.success(`${results.length} file(s) uploaded successfully`);
      }
      fetchData();
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  // File handlers
  const handleFileSelect = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    await handleFileUpload(fileList);
    e.target.value = "";
  };

  const handleDragEnter = (e) => {
    if (!isExternalFileDrag(e)) return;

    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    if (!isExternalFileDrag(e)) return;

    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragActive(false);
    }
  };

  const handleDragOver = (e) => {
    if (!isExternalFileDrag(e)) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = async (e) => {
    if (!isExternalFileDrag(e)) return;

    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragActive(false);
    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;
    await handleFileUpload(fileList);
  };

  const openFile = async (fileId) => {
    try {
      const res = await filesAPI.getFileUrl(fileId);
      window.open(res.data.presignedUrl, "_blank");
    } catch (err) {
      toast.error("Failed to open file");
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await filesAPI.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setDeleteConfirm(null);
      toast.success(currentView === 'trash' ? "File permanently deleted" : "File moved to trash");
    } catch (err) {
      toast.error("Failed to delete file");
    }
  };

  // Bulk delete handler for selected items (files + folders)
  const handleBulkDelete = async () => {
    if (!deleteConfirm?.bulk || !deleteConfirm?.ids?.length) return;

    try {
      const isTrashView = currentView === 'trash';

      // Separate files and folders from selected items
      const itemsToDelete = deleteConfirm.ids
        .map((id) => allItems.find((item) => item.id === id))
        .filter(Boolean);

      const fileIds = itemsToDelete.filter((item) => !isItemFolder(item)).map((item) => item.id);
      const folderIds = itemsToDelete.filter((item) => isItemFolder(item)).map((item) => item.id);

      // Delete files
      if (fileIds.length > 0) {
        if (isTrashView) {
          // Permanent delete from trash
          await Promise.all(fileIds.map((id) => filesAPI.deleteFile(id)));
        } else {
          // Soft delete (move to trash)
          await Promise.all(fileIds.map((id) => filesAPI.deleteFile(id)));
        }
      }

      // Delete folders
      if (folderIds.length > 0) {
        if (isTrashView) {
          // Permanent delete from trash (delete contents)
          await Promise.all(folderIds.map((id) => foldersAPI.deleteFolderContents(id)));
        } else {
          // Soft delete (move to trash)
          await Promise.all(folderIds.map((id) => foldersAPI.deleteFolder(id)));
        }
      }

      // Update UI
      const deletedIds = new Set([...fileIds, ...folderIds]);
      setFiles((prev) => prev.filter((f) => !deletedIds.has(f.id)));
      setFolders((prev) => prev.filter((f) => !deletedIds.has(f.id)));
      setDeleteConfirm(null);
      clearSelection();

      if (isTrashView) {
        toast.success("Items permanently deleted");
      } else {
        toast.success(`${itemsToDelete.length} item(s) moved to trash`);
      }
    } catch (err) {
      toast.error("Failed to delete items");
    }
  };

  // Toggle star for file
  const toggleStarFile = async (fileId) => {
    try {
      const res = await filesAPI.toggleStarFile(fileId);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isStarred: res.data.isStarred } : f))
      );
      toast.success(res.data.isStarred ? "File starred" : "File unstarred");
    } catch (err) {
      toast.error("Failed to update star status");
    }
  };

  // Toggle star for folder
  const toggleStarFolder = async (folderId) => {
    try {
      const res = await foldersAPI.toggleStarFolder(folderId);
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, isStarred: res.data.isStarred } : f))
      );
      toast.success(res.data.isStarred ? "Folder starred" : "Folder unstarred");
    } catch (err) {
      toast.error("Failed to update star status");
    }
  };

  // Restore file from trash
  const restoreFile = async (fileId) => {
    try {
      await filesAPI.restoreFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File restored");
    } catch (err) {
      toast.error("Failed to restore file");
    }
  };

  // Restore folder from trash
  const restoreFolder = async (folderId) => {
    try {
      await foldersAPI.restoreFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      toast.success("Folder restored");
    } catch (err) {
      toast.error("Failed to restore folder");
    }
  };

  // Empty trash
  const emptyTrash = async () => {
    try {
      await filesAPI.emptyTrashFiles();
      await foldersAPI.emptyTrashFolders();
      setFiles([]);
      setFolders([]);
      toast.success("Trash emptied");
    } catch (err) {
      toast.error("Failed to empty trash");
    }
  };

  // Folder operations
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await foldersAPI.createFolder(
        newFolderName.trim(),
        currentFolderId
      );
      setFolders((prev) => [...prev, res.data]);
      setNewFolderDialog(false);
      setNewFolderName("");
      setActiveMenu(null);
      toast.success("Folder created");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create folder");
    }
  };

  const renameFolder = async () => {
    if (!renameName.trim() || !renameDialog) return;
    try {
      const res = await foldersAPI.renameFolder(
        renameDialog.id,
        renameName.trim()
      );
      setFolders((prev) =>
        prev.map((f) => (f.id === res.data.id ? res.data : f))
      );
      setRenameDialog(null);
      setRenameName("");
      toast.success("Folder renamed");
    } catch (err) {
      toast.error("Failed to rename folder");
    }
  };

  const deleteFolder = async () => {
    if (!deleteFolderDialog) return;
    try {
      const folderId = deleteFolderDialog.id;
      if (deleteFolderContents) {
        await foldersAPI.deleteFolderContents(folderId);
        toast.success("Folder and contents deleted");
      } else {
        await foldersAPI.deleteFolder(folderId);
        toast.success("Folder deleted");
      }
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setDeleteFolderDialog(null);
      setDeleteFolderContents(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to delete folder");
    }
  };

  // Move item
  const handleMove = async (items, targetFolderId) => {
    setMovingItems(true);
    try {
      const normalizedItems = Array.isArray(items) ? items : [items];
      const movableItems = normalizedItems.filter(
        (item) => item && item.id && item.id !== targetFolderId
      );

      await Promise.all(
        movableItems.map((item) => {
          if (isItemFolder(item)) {
            return foldersAPI.moveFolder(item.id, targetFolderId);
          }

          return filesAPI.moveFile(item.id, targetFolderId);
        })
      );

      const movedIds = new Set(movableItems.map((item) => item.id));
      setFolders((prev) => prev.filter((folder) => !movedIds.has(folder.id)));
      setFiles((prev) => prev.filter((file) => !movedIds.has(file.id)));
      setMoveDialog(null);
      clearSelection();
      toast.success(
        movableItems.length > 1 ? "Items moved successfully" : "Item moved successfully"
      );
      fetchData();
    } catch (err) {
      toast.error("Failed to move item");
    } finally {
      setMovingItems(false);
    }
  };

  // Drag and drop between folders
  const handleItemDragStart = (item, e) => {
    const selectedDraggedItems =
      selectedItems.includes(item.id)
        ? selectedItems
            .map((id) => allItems.find((candidate) => candidate.id === id))
            .filter(Boolean)
        : [item];

    setDragItem(item);
    setDragItems(selectedDraggedItems);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    setDragActive(false);
    e.stopPropagation();
  };

  const handleItemDragEnd = () => {
    setDragItem(null);
    setDragItems([]);
    setDropTarget(null);
  };

  const handleFolderDragOver = (folderId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedIds = new Set(
      (dragItems.length ? dragItems : [dragItem])
        .filter(Boolean)
        .map((item) => item.id)
    );

    if (draggedIds.size > 0 && !draggedIds.has(folderId)) {
      setDropTarget(folderId);
    }
  };

  const handleFolderDragLeave = (folderId, e) => {
    e.stopPropagation();
    if (dropTarget === folderId) {
      setDropTarget(null);
    }
  };

  const handleFolderDrop = async (folderId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const itemsToMove = dragItems.length ? dragItems : dragItem ? [dragItem] : [];
    const hasInvalidTarget = itemsToMove.some((item) => item.id === folderId);

    if (itemsToMove.length > 0 && !hasInvalidTarget) {
      await handleMove(itemsToMove, folderId);
    }
    setDragItem(null);
    setDragItems([]);
    setDropTarget(null);
  };

  // Computed values
  const allItems = [
    ...folders.filter(Boolean).map((f) => ({ ...f, isFolder: true })),
    ...files.filter(Boolean).map((f) => ({ ...f, isFolder: false })),
  ];

  const filteredItems = filterItems(allItems, searchQuery);
  const sortedItems = sortItems(filteredItems, sortBy, sortOrder);

  const handleLogout = () => {};

  // Check if there are active uploads
  const activeUploadsCount = uploads.filter(
    (u) => u.status === "uploading" || u.status === "pending"
  ).length;

  const renderItemMenu = (item) => {
    if (activeMenu !== item.id) return null;

    const itemIsFolder = isItemFolder(item);
    const isTrashView = currentView === "trash";

    return (
      <div
        className="item-menu absolute top-12 right-3 z-20 min-w-[140px] rounded-xl border border-white/10 bg-[#111827] p-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="context-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
          onClick={() => {
            setActiveMenu(null);
            if (itemIsFolder) {
              navigateToFolder(item.id);
              return;
            }
            openFile(item.id);
          }}
        >
          <ExternalLink className="w-4 h-4" />
          Open
        </button>
        <button
          className="context-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
          onClick={() => {
            setActiveMenu(null);
            if (isTrashView) {
              if (itemIsFolder) {
                restoreFolder(item.id);
                return;
              }

              restoreFile(item.id);
              return;
            }
            if (itemIsFolder) {
              toggleStarFolder(item.id);
              return;
            }
            toggleStarFile(item.id);
          }}
        >
          <Star className="w-4 h-4" />
          {isTrashView ? "Restore" : item.isStarred ? "Unstar" : "Star"}
        </button>
        <button
          className="context-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
          onClick={() => {
            setActiveMenu(null);
            if (itemIsFolder) {
              setDeleteFolderDialog(item);
              return;
            }
            setDeleteConfirm({ id: item.id, filename: item.filename || item.name });
          }}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    );
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
            onClick={() => handleViewChange('drive')}
            className={`nav-item w-full ${currentView === 'drive' ? "active" : ""}`}
          >
            <Home className="w-5 h-5" />
            My Drive
          </button>

          <button
            onClick={() => handleViewChange('starred')}
            className={`nav-item w-full ${currentView === 'starred' ? "active" : ""}`}
          >
            <Star className="w-5 h-5" />
            Starred
          </button>

          <button
            onClick={() => handleViewChange('recent')}
            className={`nav-item w-full ${currentView === 'recent' ? "active" : ""}`}
          >
            <Clock className="w-5 h-5" />
            Recent
          </button>

          <button
            onClick={() => handleViewChange('trash')}
            className={`nav-item w-full ${currentView === 'trash' ? "active" : ""}`}
          >
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
              {user?.firstName?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500 truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <SignOutButton>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <LogOut className="w-4 h-4 text-gray-400" />
              </button>
            </SignOutButton>
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
                    <button
                      onClick={() => setSearchQuery("")}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center water-toggle rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "grid"
                      ? "bg-white/20 text-white"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "list"
                      ? "bg-white/20 text-white"
                      : "text-gray-500 hover:text-white"
                  }`}
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
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          if (sortBy === option.key) {
                            setSortOrder(
                              sortOrder === "asc" ? "desc" : "asc"
                            );
                          } else {
                            setSortBy(option.key);
                            setSortOrder("asc");
                          }
                          setSortDropdownOpen(false);
                        }}
                        className={`context-menu-item w-full ${
                          sortBy === option.key ? "bg-white/10" : ""
                        }`}
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                        {sortBy === option.key &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="w-4 h-4 ml-auto" />
                          ) : (
                            <ArrowDown className="w-4 h-4 ml-auto" />
                          ))}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main
          className="p-6"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={navigateToRoot}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
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
              <button
                onClick={clearSelection}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium">
                {selectedItems.length} selected
              </span>
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
                  setMoveDialog({
                    items: selectedItems
                      .map((id) => allItems.find((i) => i.id === id))
                      .filter(Boolean),
                  });
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
                onClick={() =>
                  setDeleteConfirm({ bulk: true, ids: selectedItems })
                }
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
              {currentView === 'trash' ? (
                <Button
                  onClick={emptyTrash}
                  variant="outline"
                  className="water-button border-red-500/50 hover:bg-red-500/20 text-red-400 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Empty Trash
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setNewFolderDialog(true)}
                    variant="outline"
                    className="water-button border-white/10 hover:bg-white/10 text-gray-200 gap-2"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </Button>
                </>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {currentView === 'starred' ? 'Starred items' :
               currentView === 'recent' ? 'Recent items' :
               currentView === 'trash' ? 'Trash' :
               `${folders.length} folders, ${files.length} files`}
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
              <h3 className="text-2xl font-bold gradient-text-full mb-3">
                {currentView === 'starred' ? 'No starred items' :
                 currentView === 'recent' ? 'No recent items' :
                 currentView === 'trash' ? 'Trash is empty' :
                 'Welcome to DriveX'}
              </h3>
              <p className="text-gray-500 text-center max-w-md mb-8">
                {currentView === 'starred' ? 'Star your files and folders for quick access.' :
                 currentView === 'recent' ? 'Files you\'ve recently interacted with will appear here.' :
                 currentView === 'trash' ? 'Deleted files will appear here.' :
                 'Your personal cloud storage is ready. Upload files or create folders to get started.'}
              </p>
              {currentView === 'drive' && (
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
              )}
            </div>
          ) : dragActive ? (
            /* Drag Active State */
            <div className="water-dropzone rounded-2xl p-12 flex flex-col items-center justify-center border-2 border-dashed border-cyan-400/50">
              <div className="w-20 h-20 rounded-2xl bg-brand-gradient-full flex items-center justify-center mb-4 water-glow">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <p className="text-lg font-medium text-white">
                Drop files to upload
              </p>
              {activeUploadsCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-cyan-400 mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading {activeUploadsCount} file(s)...
                </div>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortedItems.map((item, index) => {
                if (!item) return null;

                const itemId = item.id;
                const safeKey = itemId ?? `fallback-${index}`;
                const isSelected = itemId
                  ? selectedItems.includes(itemId)
                  : false;
                const isDragging = dragItem ? dragItem.id === itemId : false;
                const isDropTarget =
                  itemId === dropTarget && isItemFolder(item);
                const itemIsFolder = isItemFolder(item);
                const isHovered = itemId === hoveredItem;

                return (
                  <div
                    key={safeKey}
                    draggable
                    onDragStart={(e) => handleItemDragStart(item, e)}
                    onDragEnd={handleItemDragEnd}
                    onDragOver={
                      itemIsFolder
                        ? (e) => handleFolderDragOver(itemId, e)
                        : undefined
                    }
                    onDragLeave={
                      itemIsFolder
                        ? (e) => handleFolderDragLeave(itemId, e)
                        : undefined
                    }
                    onDrop={
                      itemIsFolder
                        ? (e) => handleFolderDrop(itemId, e)
                        : undefined
                    }
                    onClick={() => {
                      if (itemIsFolder) {
                        navigateToFolder(itemId);
                      } else {
                        openFile(itemId);
                      }
                    }}
                    onMouseEnter={() => setHoveredItem(itemId)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`water-card rounded-2xl p-4 cursor-pointer group relative transition-all duration-200 ${
                      isDragging ? "opacity-50 scale-95" : ""
                    } ${
                      isDropTarget
                        ? "ring-2 ring-cyan-400 scale-105 bg-cyan-500/10"
                        : ""
                    } ${isSelected ? "water-card-selected" : ""}`}
                  >
                    {/* Selection Checkbox - Only on hover */}
                    {isHovered && (
                      <div
                        onClick={(e) => toggleSelect(item, e)}
                        className="absolute top-3 left-3 z-10 transition-opacity"
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                            isSelected
                              ? "bg-cyan-500 border-cyan-500"
                              : "border-gray-400 hover:border-cyan-400"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons - Only on hover */}
                    {isHovered && !isSelected && (
                      <div className="absolute top-3 right-3 z-10 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(
                              activeMenu === itemId ? null : itemId
                            );
                          }}
                          className="menu-toggle p-1.5 rounded-lg water-action-btn"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Selected Actions */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-10 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(
                              activeMenu === itemId ? null : itemId
                            );
                          }}
                          className="menu-toggle p-1.5 rounded-lg water-action-btn"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {renderItemMenu(item)}

                    {/* Content */}
                    <div className="flex flex-col items-center text-center pt-4">
                      <div
                        className={`w-16 h-16 rounded-2xl ${getIconGradientClass(
                          item.mimeType
                        )} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
                      >
                        {itemIsFolder ? (
                          <Folder
                            className={`w-8 h-8 ${getIconColorClass(null)}`}
                          />
                        ) : item.mimeType?.startsWith("image/") ? (
                          <Image
                            className={`w-8 h-8 ${getIconColorClass(
                              item.mimeType
                            )}`}
                          />
                        ) : item.mimeType?.startsWith("video/") ? (
                          <Film
                            className={`w-8 h-8 ${getIconColorClass(
                              item.mimeType
                            )}`}
                          />
                        ) : item.mimeType?.startsWith("audio/") ? (
                          <Music
                            className={`w-8 h-8 ${getIconColorClass(
                              item.mimeType
                            )}`}
                          />
                        ) : item.mimeType?.includes("pdf") ||
                          item.mimeType?.includes("word") ||
                          item.mimeType?.includes("docx") ? (
                          <FileText
                            className={`w-8 h-8 ${getIconColorClass(
                              item.mimeType
                            )}`}
                          />
                        ) : item.mimeType?.includes("zip") ||
                          item.mimeType?.includes("archive") ? (
                          <Archive
                            className={`w-8 h-8 ${getIconColorClass(
                              item.mimeType
                            )}`}
                          />
                        ) : (
                          <File
                            className={`w-8 h-8 ${getIconColorClass(
                              item.mimeType
                            )}`}
                          />
                        )}
                      </div>
                      <p className="text-sm font-medium truncate w-full">
                        {item.name || item.filename}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </main>

        {newFolderDialog && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setNewFolderDialog(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white">Create Folder</h2>
              <p className="mt-2 text-sm text-gray-400">
                Add a new folder to {breadcrumbs[breadcrumbs.length - 1]?.name || "My Drive"}.
              </p>
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createFolder();
                  }
                }}
                placeholder="Folder name"
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500"
              />
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewFolderDialog(false);
                    setNewFolderName("");
                  }}
                  className="border-white/10 bg-transparent text-gray-200 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                  className="bg-brand-gradient-full text-white hover:opacity-90"
                >
                  Create
                </Button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white">
                {deleteConfirm.bulk ? "Delete Items" : "Delete File"}
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                {deleteConfirm.bulk
                  ? `Delete ${deleteConfirm.ids?.length || 0} item(s)?`
                  : `Delete "${deleteConfirm.filename}"?`}
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="border-white/10 bg-transparent text-gray-200 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteConfirm.bulk ? handleBulkDelete : () => handleDeleteFile(deleteConfirm.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {deleteFolderDialog && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setDeleteFolderDialog(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white">Delete Folder</h2>
              <p className="mt-2 text-sm text-gray-400">
                Delete "{deleteFolderDialog.name}"?
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteFolderDialog(null)}
                  className="border-white/10 bg-transparent text-gray-200 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteFolder}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
