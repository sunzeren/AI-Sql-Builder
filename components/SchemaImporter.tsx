import React, { useState, useRef } from 'react';
import { Upload, Plus, Database, Tag } from 'lucide-react';
import { parseSqlSchemas } from '../utils/sqlParser';
import { TableDefinition } from '../types';

interface SchemaImporterProps {
  onImport: (tables: TableDefinition[]) => void;
}

export const SchemaImporter: React.FC<SchemaImporterProps> = ({ onImport }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [pasteContent, setPasteContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const getTags = (): string[] => {
      return tagInput.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean);
  };

  const processTables = (rawTables: TableDefinition[]) => {
      const tags = getTags();
      return rawTables.map(t => ({
          ...t,
          tags: tags.length > 0 ? tags : undefined
      }));
  };

  const handleParse = (content: string) => {
    try {
      const tables = parseSqlSchemas(content);
      if (tables.length === 0) {
        setError("未能在内容中找到有效的 'CREATE TABLE' 语句。");
        return;
      }
      onImport(processTables(tables));
      setPasteContent(''); // Clear after success
      setTagInput(''); // Clear tags
      setError(null);
    } catch (e) {
      setError("解析 SQL 失败，请检查格式。");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleParse(text);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => setError("读取文件失败");
    reader.readAsText(file);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">导入表结构</h2>
      </div>

      <div className="flex gap-2 mb-4 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('paste')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'paste'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          粘贴 SQL
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'file'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          上传 .sql 文件
        </button>
      </div>

      <div className="space-y-3">
         {/* Tag Input Section - Always Visible */}
         <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-md px-3 py-2">
            <Tag className="w-4 h-4 text-slate-500" />
            <input 
                type="text" 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="添加标签 (可选, 如: 北森, 系统表)..."
                className="bg-transparent border-none text-sm text-slate-200 placeholder-slate-500 focus:outline-none w-full"
            />
         </div>

         {activeTab === 'paste' ? (
            <>
            <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="在此粘贴 CREATE TABLE 语句..."
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-md p-3 text-sm text-slate-200 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
            <button
                onClick={() => handleParse(pasteContent)}
                disabled={!pasteContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md text-sm font-medium transition-colors w-full justify-center"
            >
                <Plus className="w-4 h-4" />
                解析并添加
            </button>
            </>
        ) : (
            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-md hover:border-slate-500 transition-colors bg-slate-900">
            <input
                type="file"
                accept=".sql,.txt"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
            />
            <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer p-6 w-full h-full justify-center"
            >
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-300">点击上传 SQL 文件</span>
                <span className="text-xs text-slate-500 mt-1">支持 .sql 或 .txt</span>
            </label>
            </div>
        )}
      </div>

      {error && (
        <div className="mt-3 text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900/50">
          {error}
        </div>
      )}
    </div>
  );
};