import React, { useState } from 'react';
import { X, Plus, Tag, Settings2 } from 'lucide-react';

interface TagManagerProps {
  tags: string[];
  onUpdateTags: (newTags: string[]) => void;
  onClose: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ tags, onUpdateTags, onClose }) => {
  const [newTag, setNewTag] = useState('');

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onUpdateTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onUpdateTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-slate-100">标签库管理</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-xs text-slate-400 mb-4">
            这些标签将用于 AI 自动分类和表结构语义理解。
          </p>

          <form onSubmit={handleAdd} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="输入新标签..."
                className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 pl-8 pr-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
                autoFocus
              />
              <Tag className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={!newTag.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-md transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
            {tags.length === 0 ? (
              <span className="text-sm text-slate-500 italic">暂无标签，请添加...</span>
            ) : (
              tags.map(tag => (
                <div key={tag} className="flex items-center gap-1 bg-slate-800 text-slate-200 px-3 py-1.5 rounded-full border border-slate-700 text-sm group hover:border-blue-500/50 transition-colors">
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemove(tag)}
                    className="ml-1 text-slate-500 hover:text-red-400 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};