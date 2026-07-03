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
  UploadCloud, FolderUp, Pencil, Save, Trash2, Loader2, Code2, X
} from 'lucide-react';
import { ServerRecord } from '../../lib/types';
import { formatBytes } from '../../lib/utils';
import { btn, ghostBtn, inp } from '../../lib/constants';
import { HeadersMap, agentServerPath, readResponse, requestJson, withPathQuery } from '../../lib/http';
import { cn } from '../ui';
import { useConfirm } from '../feedback/FeedbackProvider';

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
      // Increased this slightly higher than selection background so matching words still stand out
      '.cm-selectionMatch': {
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
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
  const confirm = useConfirm();
  
  const selectedName = useMemo(() => selectedPath.split('/').filter(Boolean).pop() || '', [selectedPath]);
  const hasUnsavedChanges = content !== originalContent;

  useEffect(() => {
    setPath('/');
    setSelectedPath('');
    setContent('');
    setOriginalContent('');
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
    try {
      const data = agentPayload(await requestJson(apiBase, fileUrl('/files/content', target), authHeaders));
      const textContent = String(data?.content ?? '');
      setSelectedPath(target);
      setContent(textContent);
      setOriginalContent(textContent);
    } catch (error: any) {
      setMessage(`Failed to open: ${error.message}`);
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

  async function downloadPath(target: string, name: string, e: React.MouseEvent) {
    e.stopPropagation();
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
      headers: { ...authHeaders, 'Content-Type': 'application/octet-stream' },
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
    <div className="relative flex h-full min-h-[500px] flex-col overflow-hidden bg-[var(--background)]">
      
      <div className="flex h-full flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Explorer Toolbar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-3 bg-[var(--background)]">
          {!readOnly && <div className="flex items-center gap-1">
            <button 
              className={cn(ghostBtn, "p-2 hover:bg-[var(--secondary)]")} 
              disabled={loading || path === '/'} 
              onClick={() => setPath(parentPath(path))}
              title="Go up one directory"
            >
              <CornerLeftUp size={16} className="text-[var(--muted-foreground)]" />
            </button>
            <button 
              className={cn(ghostBtn, "p-2 hover:bg-[var(--secondary)]")} 
              disabled={loading} 
              onClick={() => loadDirectory(path)}
              title="Refresh directory"
            >
              <RefreshCw size={16} className={cn("text-[var(--muted-foreground)]", loading && "animate-spin")} />
            </button>
          </div>}
          
          <div className="flex items-center gap-1">
            <label className={cn(ghostBtn, "cursor-pointer gap-2 p-2 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]")}>
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
            </label>
            <label className={cn(ghostBtn, "cursor-pointer gap-2 p-2 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]")}>
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
            </label>
          </div>
        </div>

        {/* Current Path Breadcrumb */}
        <div className="border-b border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-2 font-mono text-xs text-[var(--foreground)] shadow-inner">
          {filePathLabel(path)}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
              {loading ? <Loader2 className="animate-spin mb-3" size={32} /> : <Folder className="mb-3 opacity-50" size={48} />}
              <p className="text-sm">{loading ? 'Loading...' : 'Directory is empty'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {items.map(item => {
                const isDir = Boolean(item.is_directory ?? item.isDirectory);
                const target = joinPath(path, item.name);
                
                return (
                  <div 
                    key={`${isDir ? 'd' : 'f'}:${item.name}`} 
                    className="group flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors hover:bg-[var(--secondary)]"
                    onClick={() => void openItem(item)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
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
                      {!isDir && <button className="rounded-md p-2 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]" disabled={loading} onClick={e => downloadPath(target, item.name, e)} title={`Download ${item.name}`}><Download size={16} /></button>}
                      {!readOnly && isArchive(item.name) && !isDir && <button className="rounded-md p-2 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]" disabled={loading} onClick={e => extractArchive(target, e)} title={`Extract ${item.name}`}><FileArchive size={16} /></button>}
                      {!readOnly && <button className="rounded-md p-2 hover:bg-[var(--secondary)]" disabled={loading} onClick={e => { e.stopPropagation(); setRenameTarget(item); setRenameValue(item.name); }} title={`Rename ${item.name}`}><Pencil size={16} /></button>}
                      {!readOnly && <button className="rounded-md p-2 hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]" disabled={loading} onClick={e => deletePath(target, e)} title={`Delete ${item.name}`}><Trash2 size={16} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Status Bar for Explorer */}
        {message && (
            <div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs text-[var(--muted-foreground)]">
              {message}
            </div>
        )}
      </div>

      {renameTarget && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form className="grid w-full max-w-md gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl" onSubmit={renamePath}>
            <div><h3 className="font-semibold">Rename {renameTarget.name}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">Enter one name only. Paths and URLs are not accepted.</p></div>
            <input className={inp} autoFocus value={renameValue} onChange={event => setRenameValue(event.target.value)} />
            <div className="flex justify-end gap-2"><button type="button" className={ghostBtn} onClick={() => setRenameTarget(null)}>Cancel</button><button className={btn} disabled={loading || !renameValue.trim()}>Rename</button></div>
          </form>
        </div>, document.body
      )}

      {/* --- EDITOR POP-OUT MODAL --- */}
      {selectedPath && typeof document !== 'undefined' && createPortal((
        <div className="font-mono fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6 md:p-10 lg:p-16">
          
          <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--color-page)] shadow-2xl">
            
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <div className="flex items-center gap-4 min-w-0">
                <button 
                  onClick={closeEditor}
                  className={cn(ghostBtn, "p-1.5 hover:bg-[var(--destructive)]/10 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors")}
                  title="Close file"
                >
                  <X size={20} />
                </button>
                
                <div className="flex items-center gap-2 min-w-0 border-l border-[var(--border)] pl-4">
                  <Code2 size={18} className="text-[var(--primary)] shrink-0" />
                  <p className="truncate font-mono text-sm font-medium text-[var(--foreground)]">
                    {selectedName}
                    {hasUnsavedChanges && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-orange-500" title="Unsaved changes"></span>}
                  </p>
                </div>
              </div>
              
              {!readOnly ? <button 
                className={cn(btn, "gap-2 transition-all shadow-sm", hasUnsavedChanges ? "bg-[var(--primary)] text-primary-foreground hover:bg-[var(--primary)]/90" : "bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--secondary)]/80")} 
                disabled={loading || (!hasUnsavedChanges && content.length > 0)} 
                onClick={() => void saveFile()}
              >
                {loading && hasUnsavedChanges ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </button> : <span className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">Read only</span>}
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
                  tabSize: 2,
                }}
                editable={!readOnly}
                onChange={value => { if (!readOnly) setContent(value); }}
              />
            </div>

            {/* Status Bar for Editor */}
            <div className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--background)] px-4 text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
              <div className="flex items-center gap-3">
                {loading ? <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Processing...</span> : <span>{readOnly ? 'Viewing' : 'Editing'}</span>}
                {message && <span className="normal-case text-[var(--foreground)] opacity-80 border-l border-[var(--border)] pl-3">{message}</span>}
              </div>
              <div className="flex items-center gap-4">
                <span className={cn(hasUnsavedChanges ? "text-orange-500" : "")}>
                  {hasUnsavedChanges ? 'Modified' : 'Unmodified'}
                </span>
                <span>UTF-8</span>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
