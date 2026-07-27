import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';
import {
  Download, FileArchive, Folder, File as FileIcon, CornerLeftUp, RefreshCw,
  UploadCloud, FolderUp, Pencil, Save, Trash2, Loader2, Code2, X,
  FolderPlus, Move, Package, Square, CheckSquare, AlertTriangle
} from 'lucide-react';
import { ServerRecord } from '../../lib/types';
import { formatBytes } from '../../lib/utils';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { HeadersMap, agentServerPath, readResponse, requestJson, withPathQuery } from '../../lib/http';
import { csrfHeaders } from '../../lib/csrf';
import { cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';
import { FileOperationDialog } from './files/FileOperationDialog';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });

export const charcoalTheme = [
  EditorView.theme(
    {
      '&': {
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
      },
      '.cm-scroller': {
        backgroundColor: 'var(--background)',
        fontFamily: '"IBM Plex Mono", "IBM Plex Sans", monospace',
        fontSize: '1rem',
      },
      '.cm-content': {
        caretColor: 'var(--primary)',
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--primary)',
      },
      '.cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'rgba(255, 255, 255, 0.25) !important',
      },
      '.cm-selectionMatch': {
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
      },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        { backgroundColor: 'var(--secondary) !important',
          color: '#ffff !important'
         },
      '.cm-activeLine': {
        backgroundColor: 'var(--secondary)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--secondary)',
        color: 'var(--primary)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--background)',
        color: 'var(--muted-foreground)',
        borderRight: '1px solid var(--border)',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 12px 0 8px',
      },
      '.cm-foldGutter': {
        color: 'var(--muted-foreground)',
      },
      '.cm-matchingBracket, .cm-nonmatchingBracket': {
        backgroundColor: 'var(--muted)',
        outline: '1px solid var(--border)',
      },
      '.cm-tooltip': {
        backgroundColor: 'var(--popover)',
        border: '1px solid var(--border)',
        color: 'var(--popover-foreground)',
        borderRadius: 'var(--radius-panel)',
      },
    },
    { dark: true }
  ),

  syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: '#f97316' },
      { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e7e7e7' },
      { tag: [t.function(t.variableName), t.labelName], color: '#38bdf8' },
      { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#a78bfa' },
      { tag: [t.definition(t.name), t.separator], color: '#f5f5f5' },
      { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier], color: '#facc15' },
      { tag: [t.operator, t.operatorKeyword], color: '#fb7185' },
      { tag: [t.url, t.escape, t.regexp, t.link], color: '#22c55e' },
      { tag: [t.meta, t.comment], color: '#737373' },
      { tag: t.strong, fontWeight: 'bold' },
      { tag: t.emphasis, fontStyle: 'italic' },
      { tag: t.strikethrough, textDecoration: 'line-through' },
      { tag: t.link, textDecoration: 'underline' },
      { tag: t.heading, fontWeight: 'bold', color: '#f97316' },
      { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#2dd4bf' },
      { tag: [t.processingInstruction, t.string, t.inserted], color: '#86efac' },
      { tag: t.invalid, color: '#ef4444' },
    ])
  ),
];

type FileItem = {
  name: string;
  is_directory?: boolean;
  isDirectory?: boolean;
  size?: number | string;
  last_modified?: string;
  lastModified?: string;
};

type FileOpenError = {
  target: string;
  name: string;
  code?: string;
  reason: string;
};

function joinPath(base: string, name: string) {
  const normalized = base === '/' ? '' : base.replace(/\/$/, '');
  return `${normalized}/${name}` || '/';
}

function parentPath(path: string) {
  if (path === '/') return '/';
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '/';
}

function filePathLabel(path: string) {
  return path === '/' ? '/' : path;
}

function normalizeUploadName(file: File) {
  return String((file as any).webkitRelativePath || file.name).replace(/\\/g, '/').replace(/^\/+/, '');
}

function isArchive(name: string) {
  return /\.(zip|tar|tar\.gz|tgz)$/i.test(name);
}

function agentPayload(data: any) {
  return data?.data ?? data;
}

function editorExtensions(path: string): Extension[] {
  const name = path.toLowerCase();
  if (name.endsWith('.json')) return [json()];
  if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(name)) return [javascript({ jsx: true, typescript: name.endsWith('.ts') || name.endsWith('.tsx') })];
  return [];
}

export function ServerFiles({
  server,
  apiBase,
  authHeaders,
  readOnly = false
}: {
  server: ServerRecord;
  apiBase: string;
  authHeaders: HeadersMap;
  readOnly?: boolean;
}) {
  const [path, setPath] = useState('/');
  const [items, setItems] = useState<FileItem[]>([]);
  const [selectedPath, setSelectedPath] = useState('');
  
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState(''); 
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [operation, setOperation] = useState<'folder' | 'archive' | null>(null);
  const [operationValue, setOperationValue] = useState('');
  const [openError, setOpenError] = useState<FileOpenError | null>(null);
  const confirm = useConfirm();
  
  const selectedName = useMemo(() => selectedPath.split('/').filter(Boolean).pop() || '', [selectedPath]);
  const hasUnsavedChanges = content !== originalContent;
  const canMoveSelectionHere = selectedPaths.length > 0 && selectedPaths.every(source => parentPath(source) !== path);

  useEffect(() => {
    setPath('/');
    setSelectedPath('');
    setContent('');
    setOriginalContent('');
    setSelectedPaths([]);
    setOperation(null);
    setOpenError(null);
  }, [server.id]);

  useEffect(() => {
    if (!selectedPath) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [selectedPath]);

  useEffect(() => {
    if (!selectedPath) {
      void loadDirectory(path);
    }
  }, [server.id, path, selectedPath]);

  function fileUrl(suffix: string, targetPath: string) {
    return withPathQuery(agentServerPath(server, suffix), targetPath);
  }

  async function loadDirectory(nextPath: string) {
    setLoading(true);
    setMessage('');
    setOpenError(null);
    try {
      const data = agentPayload(await requestJson(apiBase, fileUrl('/files', nextPath), authHeaders));
      setItems((data?.items || []).slice().sort((a: FileItem, b: FileItem) => {
        const aDir = Boolean(a.is_directory ?? a.isDirectory);
        const bDir = Boolean(b.is_directory ?? b.isDirectory);
        if (aDir !== bDir) return aDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      }));
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function openItem(item: FileItem) {
    const target = joinPath(path, item.name);
    if (item.is_directory ?? item.isDirectory) {
      setPath(target);
      return;
    }

    setLoading(true);
    setMessage('');
    setOpenError(null);
    try {
      const data = agentPayload(await requestJson(apiBase, fileUrl('/files/content', target), authHeaders));
      const textContent = String(data?.content ?? '');
      setSelectedPath(target);
      setContent(textContent);
      setOriginalContent(textContent);
    } catch (error: any) {
      setOpenError({
        target,
        name: item.name,
        code: error?.code,
        reason: error?.message || 'The file could not be opened in the web editor.',
      });
      setMessage('');
    } finally {
      setLoading(false);
    }
  }

  async function closeEditor() {
    if (hasUnsavedChanges) {
      const shouldClose = await confirm({
        title: 'Discard unsaved changes?',
        description: `Your changes to ${selectedName || 'this file'} have not been saved and will be lost.`,
        confirmLabel: 'Discard changes',
        tone: 'danger'
      });
      if (!shouldClose) return;
    }
    setSelectedPath('');
    setContent('');
    setOriginalContent('');
    setMessage('');
  }

  async function saveFile() {
    if (!selectedPath) return;
    setLoading(true);
    setMessage('');
    try {
      await requestJson(apiBase, agentServerPath(server, '/files/content'), authHeaders, {
        method: 'PUT',
        body: JSON.stringify({ path: selectedPath, content })
      });
      setOriginalContent(content);
      setMessage(`Saved ${selectedName} successfully at ${new Date().toLocaleTimeString()}`);
    } catch (error: any) {
      setMessage(`Save failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function deletePath(targetPath: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!targetPath || !await confirm({
      title: 'Delete this item?',
      description: `${targetPath} will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete item',
      tone: 'danger'
    })) return;
    
    setLoading(true);
    setMessage('');
    try {
      await requestJson(apiBase, fileUrl('/files', targetPath), authHeaders, { method: 'DELETE' });
      setMessage(`Deleted ${targetPath}`);
      await loadDirectory(path);
    } catch (error: any) {
      setMessage(`Delete failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function renamePath(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    const target = joinPath(path, renameTarget.name);
    setLoading(true);
    setMessage('');
    try {
      await requestJson(apiBase, agentServerPath(server, '/files/rename'), authHeaders, {
        method: 'POST',
        body: JSON.stringify({ path: target, newName: renameValue.trim() })
      });
      setMessage(`Renamed ${renameTarget.name} to ${renameValue.trim()}`);
      setRenameTarget(null);
      await loadDirectory(path);
    } catch (error: any) {
      setMessage(`Rename failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(target: string) {
    setSelectedPaths(current => current.includes(target)
      ? current.filter(value => value !== target)
      : [...current, target]);
  }

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = operationValue.trim();
    if (!name || name === '.' || name === '..' || /[\\/\0<>:"|?*\u0000-\u001f\u007f]/.test(name)) {
      setMessage('Folder name must be a single valid name.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await requestJson(apiBase, agentServerPath(server, '/files/directory'), authHeaders, {
        method: 'POST',
        body: JSON.stringify({ path: joinPath(path, name) })
      });
      setOperation(null);
      setMessage(`Created folder ${name}`);
      await loadDirectory(path);
    } catch (error: any) {
      setMessage(`Create folder failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function moveSelectionHere() {
    if (selectedPaths.length === 0 || !await confirm({
      title: `Move ${selectedPaths.length} selected item${selectedPaths.length === 1 ? '' : 's'} here?`,
      description: `The selected items will be moved into ${path}. Existing items will not be overwritten.`,
      confirmLabel: 'Move here'
    })) return;
    setLoading(true);
    setMessage('');
    try {
      await requestJson(apiBase, agentServerPath(server, '/files/move'), authHeaders, {
        method: 'POST',
        body: JSON.stringify({ sourcePaths: selectedPaths, destinationPath: path })
      });
      setMessage(`Moved ${selectedPaths.length} item${selectedPaths.length === 1 ? '' : 's'} to ${path}`);
      setSelectedPaths([]);
      await loadDirectory(path);
    } catch (error: any) {
      setMessage(`Move failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function archiveSelection(e: React.FormEvent) {
    e.preventDefault();
    if (selectedPaths.length === 0) return;
    const rawName = operationValue.trim();
    const name = rawName.toLowerCase().endsWith('.tar.gz') ? rawName : `${rawName}.tar.gz`;
    if (!rawName || rawName === '.' || rawName === '..' || /[\\/\0<>:"|?*\u0000-\u001f\u007f]/.test(rawName)) {
      setMessage('Archive name must be a single valid name.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await requestJson(apiBase, agentServerPath(server, '/files/archive'), authHeaders, {
        method: 'POST',
        body: JSON.stringify({ sourcePaths: selectedPaths, destinationPath: joinPath(path, name) })
      });
      setOperation(null);
      setMessage(`Created ${name} from ${selectedPaths.length} selected item${selectedPaths.length === 1 ? '' : 's'}`);
      setSelectedPaths([]);
      await loadDirectory(path);
    } catch (error: any) {
      setMessage(`Archive failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSelection() {
    if (selectedPaths.length === 0 || !await confirm({
      title: `Delete ${selectedPaths.length} selected item${selectedPaths.length === 1 ? '' : 's'}?`,
      description: 'The selected files and folders will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Delete selected',
      tone: 'danger'
    })) return;
    setLoading(true);
    setMessage('');
    const failures: string[] = [];
    for (const target of selectedPaths) {
      try {
        await requestJson(apiBase, fileUrl('/files', target), authHeaders, { method: 'DELETE' });
      } catch (error: any) {
        failures.push(`${target}: ${error.message}`);
      }
    }
    setSelectedPaths([]);
    setMessage(failures.length ? `Some items could not be deleted: ${failures.slice(0, 3).join('; ')}` : 'Deleted selected items');
    await loadDirectory(path);
    setLoading(false);
  }

  async function extractArchive(target: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!await confirm({ title: 'Extract this archive?', description: `Files from ${target} will be extracted into ${path}. Existing files with matching names may be replaced.`, confirmLabel: 'Extract archive' })) return;
    setLoading(true);
    setMessage('');
    try {
      await requestJson(apiBase, agentServerPath(server, '/files/extract'), authHeaders, {
        method: 'POST',
        body: JSON.stringify({ path: target, destinationPath: path })
      });
      setMessage(`Extracted ${target}`);
      await loadDirectory(path);
    } catch (error: any) {
      setMessage(`Extraction failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPath(target: string, name: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${apiBase || '/api'}${fileUrl('/files/download', target)}`, { headers: authHeaders });
      if (!response.ok) {
        const error: any = await readResponse(response);
        throw new Error(error?.message || error?.error || 'download failed');
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`Downloaded ${name}`);
    } catch (error: any) {
      setMessage(`Download failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function uploadOne(file: File, uploadName: string) {
    const target = joinPath(path, uploadName);
    const response: any = await fetch(`${apiBase || '/api'}${fileUrl('/files/upload', target)}`, {
      method: 'POST',
      headers: { ...authHeaders, ...await csrfHeaders('POST'), 'Content-Type': 'application/octet-stream' },
      body: file
    }).then(readResponse);

    if (response?.success === false) {
      throw new Error(response?.message || response?.errorMessage || 'upload failed');
    }
  }

  async function upload(files: FileList | null) {
    const uploadFiles = Array.from(files || []).filter(file => file.size >= 0 && normalizeUploadName(file));
    if (uploadFiles.length === 0) return;

    setLoading(true);
    setMessage(`Uploading ${uploadFiles.length} file${uploadFiles.length === 1 ? '' : 's'}...`);

    const failures: string[] = [];
    try {
      for (let index = 0; index < uploadFiles.length; index += 1) {
        const file = uploadFiles[index];
        const uploadName = normalizeUploadName(file);
        setMessage(`Uploading ${index + 1}/${uploadFiles.length}: ${uploadName}`);

        try {
          await uploadOne(file, uploadName);
        } catch (error: any) {
          failures.push(`${uploadName}: ${error.message}`);
        }
      }

      if (failures.length > 0) {
        setMessage(`Uploaded ${uploadFiles.length - failures.length}/${uploadFiles.length}. Failed: ${failures.slice(0, 3).join('; ')}`);
      } else {
        setMessage(`Uploaded ${uploadFiles.length} file${uploadFiles.length === 1 ? '' : 's'} successfully.`);
      }
      await loadDirectory(path);
    } catch (error: any) {
      setMessage(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--background)]">
      
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full min-h-0 flex-col duration-200">
        {/* Explorer Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] p-3 bg-[var(--background)]">
          {!readOnly && <div className="flex items-center gap-1">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(ghostBtn, "p-2 hover:bg-[var(--secondary)]")} 
              disabled={loading || path === '/'} 
              onClick={() => setPath(parentPath(path))}
              title="Go up one directory"
            >
              <CornerLeftUp size={16} className="text-[var(--muted-foreground)]" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(ghostBtn, "p-2 hover:bg-[var(--secondary)]")} 
              disabled={loading} 
              onClick={() => loadDirectory(path)}
              title="Refresh directory"
            >
              <RefreshCw size={16} className={cn("text-[var(--muted-foreground)]", loading && "animate-spin")} />
            </motion.button>
          </div>}
          
          <div className="flex items-center gap-1">
            {!readOnly && <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={cn(ghostBtn, "gap-2 p-2 hover:bg-[var(--secondary)]")} disabled={loading} onClick={() => { setOperation('folder'); setOperationValue(''); }} title="Create folder">
              <FolderPlus size={16} />
              <span className="hidden text-sm font-medium md:inline">New folder</span>
            </motion.button>}
            {!readOnly && <motion.label whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={cn(ghostBtn, "cursor-pointer gap-2 p-2 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]")}>
              <UploadCloud size={16} />
              <span className="text-sm font-medium">Upload files</span>
              <input
                className="hidden"
                type="file"
                multiple
                onChange={e => {
                  void upload(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
            </motion.label>}
            {!readOnly && <motion.label whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={cn(ghostBtn, "cursor-pointer gap-2 p-2 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]")}>
              <FolderUp size={16} />
              <span className="hidden text-sm font-medium sm:inline">Upload folder</span>
              <input
                className="hidden"
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as any)}
                onChange={e => {
                  void upload(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
            </motion.label>}
          </div>
        </div>

        {/* Current Path Breadcrumb */}
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-2 font-mono text-xs text-[var(--foreground)] shadow-inner">
          {filePathLabel(path)}
        </div>

        {!readOnly && selectedPaths.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--primary)]/5 px-3 py-2">
            <span className="mr-auto text-xs font-semibold text-[var(--foreground)]">{selectedPaths.length} selected</span>
            <button type="button" className={cn(ghostBtn, 'h-8 gap-1.5 px-2.5 text-xs')} disabled={loading || !canMoveSelectionHere} onClick={() => void moveSelectionHere()} title={canMoveSelectionHere ? `Move selected items into ${path}` : 'Navigate to a different folder to move the selection'}><Move size={14} /> Move here</button>
            <button type="button" className={cn(ghostBtn, 'h-8 gap-1.5 px-2.5 text-xs')} disabled={loading} onClick={() => { setOperation('archive'); setOperationValue(`archive-${new Date().toISOString().slice(0, 10)}`); }}><Package size={14} /> Archive</button>
            <button type="button" className={cn(ghostBtn, 'h-8 gap-1.5 px-2.5 text-xs text-[var(--destructive)] hover:bg-[var(--destructive)]/10')} disabled={loading} onClick={() => void deleteSelection()}><Trash2 size={14} /> Delete</button>
            <button type="button" className={cn(ghostBtn, 'h-8 px-2 text-xs')} disabled={loading} onClick={() => setSelectedPaths([])}>Clear</button>
          </div>
        )}

        {openError && (
          <div role="alert" className="flex items-start gap-3 border-b border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-100">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {openError.code === 'file_preview_not_text' ? 'This is not a text file' : openError.code === 'file_preview_too_large' ? 'This file is too large to preview' : `Could not open ${openError.name}`}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-100/75">{openError.reason}</p>
            </div>
            <button type="button" className="shrink-0 rounded-md border border-amber-300/20 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-amber-300/10" disabled={loading} onClick={() => void downloadPath(openError.target, openError.name)}>
              Download instead
            </button>
            <button type="button" className="shrink-0 rounded p-1 text-amber-100/60 hover:text-amber-100" onClick={() => setOpenError(null)} aria-label="Dismiss file error"><X size={15} /></button>
          </div>
        )}

        {/* File List */}
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-2 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
          {items.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
              {loading ? <Loader2 className="animate-spin mb-3" size={32} /> : <Folder className="mb-3 opacity-50" size={48} />}
              <p className="text-sm">{loading ? 'Loading...' : 'Directory is empty'}</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {items.map((item, index) => {
                const isDir = Boolean(item.is_directory ?? item.isDirectory);
                const target = joinPath(path, item.name);
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    key={`${isDir ? 'd' : 'f'}:${item.name}`} 
                    className={cn("group flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors hover:bg-[var(--secondary)]", selectedPaths.includes(target) && 'bg-[var(--secondary)]')}
                    onClick={() => void openItem(item)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {!readOnly && (
                        <button type="button" className="shrink-0 rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={event => { event.stopPropagation(); toggleSelection(target); }} aria-label={`${selectedPaths.includes(target) ? 'Deselect' : 'Select'} ${item.name}`}>
                          {selectedPaths.includes(target) ? <CheckSquare size={16} className="text-[var(--primary)]" /> : <Square size={16} />}
                        </button>
                      )}
                      {isDir ? (
                        <Folder size={18} className="shrink-0 text-blue-400" fill="currentColor" fillOpacity={0.2} />
                      ) : (
                        <FileIcon size={18} className="shrink-0 text-[var(--muted-foreground)]" />
                      )}
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                          {item.name}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {isDir ? 'Folder' : formatBytes(Number(item.size || 0))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      {!isDir && <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="rounded-md p-2 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]" disabled={loading} onClick={e => downloadPath(target, item.name, e)} title={`Download ${item.name}`}><Download size={16} /></motion.button>}
                      {!readOnly && isArchive(item.name) && !isDir && <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="rounded-md p-2 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]" disabled={loading} onClick={e => extractArchive(target, e)} title={`Extract ${item.name}`}><FileArchive size={16} /></motion.button>}
                      {!readOnly && <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="rounded-md p-2 hover:bg-[var(--secondary)]" disabled={loading} onClick={e => { e.stopPropagation(); setRenameTarget(item); setRenameValue(item.name); }} title={`Rename ${item.name}`}><Pencil size={16} /></motion.button>}
                      {!readOnly && <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="rounded-md p-2 hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]" disabled={loading} onClick={e => deletePath(target, e)} title={`Delete ${item.name}`}><Trash2 size={16} /></motion.button>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Status Bar for Explorer */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs text-[var(--muted-foreground)]"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* --- MODALS RENDERED IN PORTAL --- */}
      {typeof document !== 'undefined' && createPortal(
        <>
          <AnimatePresence>
            {operation === 'folder' && (
              <FileOperationDialog
                title="Create a new folder"
                description={`The folder will be created inside ${path}. Enter one folder name, not a path.`}
                label="Folder name"
                value={operationValue}
                submitLabel="Create folder"
                busy={loading}
                onChange={setOperationValue}
                onCancel={() => setOperation(null)}
                onSubmit={createFolder}
              />
            )}
            {operation === 'archive' && (
              <FileOperationDialog
                title={`Archive ${selectedPaths.length} selected item${selectedPaths.length === 1 ? '' : 's'}`}
                description={`A compressed .tar.gz archive will be created inside ${path}. Existing files are never overwritten.`}
                label="Archive name"
                value={operationValue}
                submitLabel="Create archive"
                busy={loading}
                onChange={setOperationValue}
                onCancel={() => setOperation(null)}
                onSubmit={archiveSelection}
              />
            )}
          </AnimatePresence>

          {/* RENAME MODAL */}
          <AnimatePresence>
            {renameTarget && (
              <motion.div 
                key="rename-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              >
                <motion.form 
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="grid w-full max-w-md gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl" 
                  onSubmit={renamePath}
                >
                  <div>
                    <h3 className="font-semibold">Rename {renameTarget.name}</h3>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">Enter one name only. Paths and URLs are not accepted.</p>
                  </div>
                  <input className={inp} autoFocus value={renameValue} onChange={event => setRenameValue(event.target.value)} />
                  <div className="flex justify-end gap-2">
                    <button type="button" className={ghostBtn} onClick={() => setRenameTarget(null)}>Cancel</button>
                    <button className={btn} disabled={loading || !renameValue.trim()}>Rename</button>
                  </div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* EDITOR POP-OUT MODAL */}
          <AnimatePresence>
            {selectedPath && (
              <motion.div 
                key="editor-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6 md:p-10 lg:p-16"
              >
                <motion.div 
                  initial={{ y: 50, scale: 0.97, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: 20, scale: 0.97, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--color-page)] shadow-2xl"
                >
                  {/* Editor Header */}
                  <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={closeEditor}
                        className={cn(ghostBtn, "p-1.5 hover:bg-[var(--destructive)]/10 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors")}
                        title="Close file"
                      >
                        <X size={20} />
                      </motion.button>
                      
                      <div className="flex items-center gap-2 min-w-0 border-l border-[var(--border)] pl-4">
                        <Code2 size={18} className="text-[var(--primary)] shrink-0" />
                        <p className="truncate font-mono text-sm font-medium text-[var(--foreground)]">
                          {selectedName}
                          {hasUnsavedChanges && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-orange-500" title="Unsaved changes"></span>}
                        </p>
                      </div>
                    </div>
                    
                    {!readOnly ? (
                      <motion.button 
                        whileHover={hasUnsavedChanges && !loading ? { scale: 1.02 } : {}}
                        whileTap={hasUnsavedChanges && !loading ? { scale: 0.98 } : {}}
                        className={cn(btn, "gap-2 transition-all shadow-sm", hasUnsavedChanges ? "bg-[var(--primary)] text-primary-foreground hover:bg-[var(--primary)]/90" : "bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--secondary)]/80")} 
                        disabled={loading || (!hasUnsavedChanges && content.length > 0)} 
                        onClick={() => void saveFile()}
                      >
                        {loading && hasUnsavedChanges ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                      </motion.button>
                    ) : (
                      <span className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">Read only</span>
                    )}
                  </div>

                  {/* CodeMirror instance */}
                  <div className="relative flex-1 overflow-hidden bg-[#282c34]">
                    <CodeMirror
                      value={content}
                      height="100%"
                      className="absolute inset-0"
                      theme={charcoalTheme}
                      extensions={editorExtensions(selectedPath)}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        highlightActiveLine: true,
                        highlightSelectionMatches: true,
                        bracketMatching: true,
                        tabSize: 1,
                      }}
                      editable={!readOnly}
                      onChange={value => { if (!readOnly) setContent(value); }}
                    />
                  </div>

                  {/* Status Bar for Editor */}
                  <div className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--background)] px-4 text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    <div className="flex items-center gap-4">
                      <span className={cn(hasUnsavedChanges ? "text-orange-500" : "")}>
                        {hasUnsavedChanges ? 'Modified' : 'Unmodified'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
