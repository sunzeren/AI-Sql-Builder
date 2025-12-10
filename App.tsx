import React, { useState, useCallback, useEffect } from 'react';
import { SchemaImporter } from './components/SchemaImporter';
import { TableList } from './components/TableList';
import { ChatArea } from './components/ChatArea';
import { SavedSqlList } from './components/SavedSqlList';
import { TagManager } from './components/TagManager';
import { TableDefinition, ChatMessage, SavedSql } from './types';
import { generateSqlFromRequirement, autoGenerateTags } from './services/geminiService';
import { DatabaseZap, Layers, Bookmark } from 'lucide-react';

const App: React.FC = () => {
  // 1. Lazy Initialization for Tables
  const [tables, setTables] = useState<TableDefinition[]>(() => {
      try {
          const stored = localStorage.getItem('mysql_ai_tables');
          return stored ? JSON.parse(stored) : [];
      } catch (e) {
          console.error("Failed to parse saved tables", e);
          return [];
      }
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // 2. Lazy Initialization for Saved SQLs
  const [savedSqls, setSavedSqls] = useState<SavedSql[]>(() => {
      try {
          const stored = localStorage.getItem('mysql_ai_saved_sqls');
          return stored ? JSON.parse(stored) : [];
      } catch (e) {
          console.error("Failed to parse saved SQLs", e);
          return [];
      }
  });

  const [activeSidebarTab, setActiveSidebarTab] = useState<'tables' | 'saved'>('tables');
  const [isLoading, setIsLoading] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  
  // 3. Lazy Initialization for Tag Library (with defaults)
  const [tagLibrary, setTagLibrary] = useState<string[]>(() => {
      const defaultTags = ['北森', '系统', '业务', '用户', '日志', '配置', '财务', '企微'];
      try {
          const stored = localStorage.getItem('mysql_ai_tag_library');
          return stored ? JSON.parse(stored) : defaultTags;
      } catch (e) {
          return defaultTags;
      }
  });

  // --- Effects for SAVING only (Loading is handled in useState) ---

  // Save tables to localStorage
  useEffect(() => {
    localStorage.setItem('mysql_ai_tables', JSON.stringify(tables));
  }, [tables]);

  // Save Tag Library
  useEffect(() => {
      localStorage.setItem('mysql_ai_tag_library', JSON.stringify(tagLibrary));
  }, [tagLibrary]);

  // Save SQLs to localStorage
  useEffect(() => {
    localStorage.setItem('mysql_ai_saved_sqls', JSON.stringify(savedSqls));
  }, [savedSqls]);

  const handleImport = useCallback((newTables: TableDefinition[]) => {
    // 1. Update Tag Library with any NEW tags manually entered by user
    const newTags = new Set<string>();
    newTables.forEach(t => t.tags?.forEach(tag => newTags.add(tag)));
    
    if (newTags.size > 0) {
        setTagLibrary(prev => {
            const combined = new Set([...prev, ...Array.from(newTags)]);
            return Array.from(combined);
        });
    }

    // 2. Merge Tables
    setTables(prev => {
        const tableMap = new Map<string, TableDefinition>(
            prev.map(t => [t.name, t] as [string, TableDefinition])
        );

        newTables.forEach(newTable => {
            if (tableMap.has(newTable.name)) {
                // Table exists: Overwrite DDL, Merge Tags
                const existingTable = tableMap.get(newTable.name)!;
                const existingTags = existingTable.tags || [];
                const currentNewTags = newTable.tags || [];
                // Allow up to 5 tags if merged manually, AI will usually stick to less
                const mergedTags = Array.from(new Set([...existingTags, ...currentNewTags]));

                tableMap.set(newTable.name, {
                    ...newTable,
                    id: existingTable.id,
                    tags: mergedTags
                });
            } else {
                tableMap.set(newTable.name, newTable);
            }
        });

        return Array.from(tableMap.values());
    });
    setActiveSidebarTab('tables');
  }, []);

  const handleRemoveTable = useCallback((id: string) => {
    setTables(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleUpdateTableTags = useCallback((tableId: string, newTags: string[]) => {
      setTables(prev => prev.map(t => 
          t.id === tableId ? { ...t, tags: newTags } : t
      ));
  }, []);

  const handleClearTables = useCallback(() => {
      setTables([]);
  }, []);

  const handleAutoTag = useCallback(async () => {
      if (tables.length === 0) return;
      setIsTagging(true);
      try {
          // Pass the current tag library to the AI
          const taggedMap = await autoGenerateTags(tables, tagLibrary);
          
          setTables(prev => prev.map(table => {
              const aiTags = taggedMap[table.name] || [];
              const currentTags = table.tags || [];
              
              // Logic: Keep current tags, append unique AI tags, limit to 3 total
              const mergedTags = Array.from(new Set([...currentTags, ...aiTags])).slice(0, 3);
              
              return { ...table, tags: mergedTags };
          }));
      } catch (e) {
          console.error("Tagging failed", e);
      } finally {
          setIsTagging(false);
      }
  }, [tables, tagLibrary]);

  const handleSaveSql = useCallback((code: string, name?: string) => {
      const newSavedSql: SavedSql = {
          id: crypto.randomUUID(),
          name: name || `SQL Query #${Math.floor(Math.random() * 10000)}`,
          code,
          timestamp: Date.now()
      };
      setSavedSqls(prev => [newSavedSql, ...prev]);
      setActiveSidebarTab('saved'); 
  }, []);

  const handleRenameSavedSql = useCallback((id: string, newName: string) => {
      setSavedSqls(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  }, []);

  const handleUpdateSavedSqlCode = useCallback((id: string, newCode: string) => {
    setSavedSqls(prev => prev.map(s => s.id === id ? { ...s, code: newCode } : s));
  }, []);

  const handleDeleteSavedSql = useCallback((id: string) => {
      setSavedSqls(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleClearSavedSqls = useCallback(() => {
      setSavedSqls([]);
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      if (tables.length === 0) {
          throw new Error("请先导入至少一个表结构，以便我理解数据库架构。");
      }

      const responseText = await generateSqlFromRequirement(tables, content);
      
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error.message || "发生未知错误。",
        timestamp: Date.now(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [tables]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
              <DatabaseZap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">MySQL AI 架构师</h1>
              <p className="text-xs text-slate-400">智能 SQL 生成与性能优化助手</p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
             Powered by Gemini 2.5
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          <SchemaImporter onImport={handleImport} />
          
          <div className="bg-slate-900 rounded-lg border border-slate-800 flex flex-col flex-1 shadow-sm overflow-hidden h-[500px] lg:h-auto">
             {/* Tabs */}
             <div className="flex border-b border-slate-800">
                 <button 
                    onClick={() => setActiveSidebarTab('tables')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeSidebarTab === 'tables' ? 'text-blue-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                     <Layers className="w-4 h-4" />
                     表结构
                 </button>
                 <button 
                    onClick={() => setActiveSidebarTab('saved')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeSidebarTab === 'saved' ? 'text-blue-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                     <Bookmark className="w-4 h-4" />
                     收藏库
                 </button>
             </div>

             <div className="p-4 flex-1 overflow-hidden">
                {activeSidebarTab === 'tables' ? (
                    <TableList 
                        tables={tables} 
                        onRemove={handleRemoveTable} 
                        onClear={handleClearTables}
                        onUpdateTags={handleUpdateTableTags}
                        onAutoTag={handleAutoTag}
                        onManageTags={() => setIsTagManagerOpen(true)}
                        isTagging={isTagging}
                    />
                ) : (
                    <SavedSqlList 
                        items={savedSqls}
                        onDelete={handleDeleteSavedSql}
                        onClear={handleClearSavedSqls}
                        onRename={handleRenameSavedSql}
                        onUpdateCode={handleUpdateSavedSqlCode}
                    />
                )}
             </div>
          </div>
        </aside>

        {/* Right Area: Chat Interface */}
        <section className="lg:col-span-8 xl:col-span-9 h-[600px] lg:h-[calc(100vh-8rem)]">
          <ChatArea 
            messages={messages} 
            onSendMessage={handleSendMessage}
            onSaveSql={handleSaveSql}
            isLoading={isLoading}
          />
        </section>
      </main>

      {/* Tag Manager Modal */}
      {isTagManagerOpen && (
        <TagManager 
            tags={tagLibrary}
            onUpdateTags={setTagLibrary}
            onClose={() => setIsTagManagerOpen(false)}
        />
      )}
    </div>
  );
};

export default App;