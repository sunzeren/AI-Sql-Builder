import React, { useState, useEffect, useRef } from 'react';
import { Table as TableIcon, Trash2, X, Check, Search, Sparkles, Loader2, Eye, FileCode, Settings2 } from 'lucide-react';
import { TableDefinition } from '../types';

interface TableListProps {
  tables: TableDefinition[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onAutoTag: () => void;
  onManageTags: () => void;
  isTagging: boolean;
}

// Modal component for viewing DDL
const DdlModal = ({ table, onClose }: { table: TableDefinition, onClose: () => void }) => {
    const codeRef = useRef<HTMLElement>(null);
    
    useEffect(() => {
        if (codeRef.current && window.Prism) {
            window.Prism.highlightElement(codeRef.current);
        }
    }, [table]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-blue-400" />
                        <h3 className="font-semibold text-slate-100">{table.name} 结构</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-auto custom-scrollbar flex-1 bg-[#1d1f21]">
                    <pre className="!m-0 !p-0 !bg-transparent text-sm">
                        <code ref={codeRef} className="language-sql">{table.ddl}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

export const TableList: React.FC<TableListProps> = ({ tables, onRemove, onClear, onAutoTag, onManageTags, isTagging }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [search, setSearch] = useState('');
  const [viewingTable, setViewingTable] = useState<TableDefinition | null>(null);

  if (tables.length === 0) {
    return (
      <div className="text-slate-500 text-center text-sm py-8 italic">
        暂无已导入的表
      </div>
    );
  }

  const handleClearClick = () => {
    if (isConfirming) {
      onClear();
      setIsConfirming(false);
    } else {
      setIsConfirming(true);
    }
  };

  const filteredTables = tables.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
        <div className="flex flex-col h-full">
        {/* Tools */}
        <div className="space-y-2 mb-3">
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="搜索表名或标签..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 pl-8 pr-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={onAutoTag}
                    disabled={isTagging}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-md py-1.5 text-xs transition-colors disabled:opacity-50"
                    title="AI 智能分析表结构并打标签"
                >
                    {isTagging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI 智能生成标签
                </button>
                <button 
                    onClick={onManageTags}
                    className="flex items-center justify-center px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-md py-1.5 text-xs transition-colors"
                    title="管理标签库"
                >
                    <Settings2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>

        <div className="flex items-center justify-between mb-2 h-6 flex-shrink-0">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                已导入表 ({filteredTables.length}/{tables.length})
            </h3>
            {isConfirming ? (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300">确定清空?</span>
                    <button 
                        onClick={handleClearClick}
                        className="p-0.5 text-green-400 hover:text-green-300 bg-green-900/30 rounded"
                        title="确认"
                    >
                        <Check className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={() => setIsConfirming(false)}
                        className="p-0.5 text-slate-400 hover:text-slate-300 bg-slate-700/50 rounded"
                        title="取消"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <button 
                    type="button"
                    onClick={handleClearClick}
                    className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
                >
                    清空全部
                </button>
            )}
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
            {filteredTables.map((table) => (
            <div
                key={table.id}
                className="group flex flex-col p-2 bg-slate-800/50 border border-slate-700/50 rounded hover:border-blue-500/50 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden cursor-pointer" onClick={() => setViewingTable(table)}>
                        <TableIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-slate-200 font-mono truncate hover:text-blue-300" title={table.name}>
                            {table.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                            onClick={() => setViewingTable(table)}
                            className="text-slate-500 hover:text-blue-400 p-1"
                            title="查看结构"
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onRemove(table.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                            title="移除"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                
                {/* Tag Display */}
                {table.tags && table.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 ml-6">
                        {table.tags.map((tag, index) => (
                            <span key={index} className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            ))}
        </div>
        </div>

        {viewingTable && (
            <DdlModal table={viewingTable} onClose={() => setViewingTable(null)} />
        )}
    </>
  );
};