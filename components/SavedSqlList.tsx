import React, { useState } from 'react';
import { Search, Copy, Check, Trash2, Code, Pencil, X } from 'lucide-react';
import { SavedSql } from '../types';

interface SavedSqlListProps {
  items: SavedSql[];
  onDelete: (id: string) => void;
  onClear: () => void;
  onRename: (id: string, newName: string) => void;
}

export const SavedSqlList: React.FC<SavedSqlListProps> = ({ items, onDelete, onClear, onRename }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (item: SavedSql) => {
      setEditingId(item.id);
      setEditName(item.name);
  };

  const saveEdit = () => {
      if (editingId && editName.trim()) {
          onRename(editingId, editName.trim());
      }
      setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
          <div className="relative">
            <input 
                type="text" 
                placeholder="搜索已保存的 SQL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">已保存 ({items.length})</h3>
        {items.length > 0 && (
             <button 
                onClick={() => { if(window.confirm('确定清空所有收藏吗?')) onClear(); }}
                className="text-xs text-red-400 hover:text-red-300 hover:underline"
            >
                清空
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
        {items.length === 0 ? (
          <div className="text-center py-8">
             <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Code className="w-6 h-6 text-slate-600" />
             </div>
             <p className="text-sm text-slate-500">暂无收藏的 SQL</p>
             <p className="text-xs text-slate-600 mt-1">在聊天中点击 "保存" 按钮</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-colors group">
               <div className="flex justify-between items-start mb-2">
                   {editingId === item.id ? (
                       <div className="flex items-center gap-2 w-full mr-2">
                           <input 
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm w-full outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                           />
                           <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                           <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300"><X className="w-4 h-4" /></button>
                       </div>
                   ) : (
                       <>
                        <div className="font-medium text-blue-400 text-sm truncate pr-2 cursor-pointer hover:text-blue-300" title={item.name} onClick={() => startEdit(item)}>
                            {item.name}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => startEdit(item)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                                title="重命名"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => handleCopy(item.id, item.code)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                                title="复制 SQL"
                            >
                                {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                                onClick={() => onDelete(item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                                title="删除"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                       </>
                   )}
               </div>
               <div className="text-xs text-slate-500 font-mono bg-slate-900/50 p-2 rounded truncate">
                   {item.code.substring(0, 50)}...
               </div>
               <div className="mt-2 flex justify-between items-center">
                   <span className="text-[10px] text-slate-600">
                       {new Date(item.timestamp).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                   </span>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};