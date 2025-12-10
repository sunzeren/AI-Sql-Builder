import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Terminal, Loader2, Copy, Check, ChevronDown, ChevronRight, BookmarkPlus, AlertTriangle, Lightbulb, Info } from 'lucide-react';
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';

// Declare Prism global to avoid TS errors
declare global {
  interface Window {
    Prism: any;
  }
}

interface ChatAreaProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onSaveSql: (code: string, name?: string) => void;
  isLoading: boolean;
}

const CodeBlock = ({ children, className, onSave, title }: { children?: React.ReactNode, className?: string, onSave?: (code: string, name?: string) => void, title?: string }) => {
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);
    const codeRef = useRef<HTMLElement>(null);
    
    const content = String(children || '').replace(/\n$/, '');
    const isSql = /language-sql/.test(className || '') || /language-mysql/.test(className || '');

    useEffect(() => {
        if (codeRef.current && window.Prism) {
            window.Prism.highlightElement(codeRef.current);
        }
    }, [children, className]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = () => {
        if (onSave) {
            onSave(content, title);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    return (
        <div className="relative group my-4 rounded-lg overflow-hidden border border-slate-700 bg-[#1d1f21]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono font-bold">
                        {isSql ? 'MYSQL' : 'CODE'}
                    </span>
                    {title && (
                        <span className="text-xs text-blue-400 border-l border-slate-700 pl-2">
                            {title}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isSql && onSave && (
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors"
                            title="保存到我的 SQL 库"
                        >
                            {saved ? <Check className="w-3 h-3 text-green-400" /> : <BookmarkPlus className="w-3 h-3" />}
                            {saved ? '已保存' : '保存'}
                        </button>
                    )}
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? '已复制' : '复制'}
                    </button>
                </div>
            </div>
            <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
               <pre className={`${className} !bg-transparent !m-0 !p-0`} style={{ margin: 0 }}>
                   <code ref={codeRef} className={className || 'language-sql'}>{children}</code>
               </pre>
            </div>
        </div>
    );
};

const AnalysisSection = ({ children }: { children?: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(true); // Default open for better visibility

    return (
        <div className="mt-4 border-t border-slate-700/50 pt-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors w-full py-2 group"
            >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span>AI 架构师分析建议</span>
                <div className="flex-1 h-px bg-slate-700/50 ml-2 group-hover:bg-slate-700 transition-colors"></div>
            </button>
            
            {isOpen && (
                <div className="mt-2 pl-2 border-l-2 border-slate-700/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="text-slate-300 text-sm">
                        <ReactMarkdown
                            components={{
                                h3: ({children}) => {
                                    const text = String(children);
                                    let icon = <Info className="w-4 h-4" />;
                                    let colorClass = "text-slate-200 border-slate-600";
                                    
                                    if (text.includes("风险") || text.includes("Critical")) {
                                        icon = <AlertTriangle className="w-4 h-4 text-red-400" />;
                                        colorClass = "text-red-200 border-red-900/50 bg-red-900/10";
                                    } else if (text.includes("建议") || text.includes("Optimization")) {
                                        icon = <Lightbulb className="w-4 h-4 text-amber-400" />;
                                        colorClass = "text-amber-200 border-amber-900/50 bg-amber-900/10";
                                    }

                                    return (
                                        <div className={`flex items-center gap-2 mt-4 mb-2 font-semibold px-2 py-1.5 rounded border ${colorClass}`}>
                                            {icon}
                                            <span>{children}</span>
                                        </div>
                                    );
                                },
                                ul: ({children}) => <ul className="list-disc pl-5 space-y-1 mb-3 text-slate-300">{children}</ul>,
                                p: ({children}) => <p className="mb-2 leading-relaxed">{children}</p>
                            }}
                        >
                            {children as string}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, onSendMessage, onSaveSql, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const renderMessageContent = (content: string) => {
      // 1. Extract Title
      const titleMatch = content.match(/<!-- TITLE: (.*?) -->/);
      const title = titleMatch ? titleMatch[1] : undefined;
      let cleanContent = content.replace(/<!-- TITLE: .*? -->\n?/, '');

      // 2. Split Analysis
      const separator = '<!-- ANALYSIS_START -->';
      const parts = cleanContent.split(separator);
      const mainContent = parts[0];
      const analysisContent = parts.length > 1 ? parts[1] : null;

      return (
          <>
            <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                    components={{
                        code({ node, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            const isInline = !match && !String(children).includes('\n');
                            if (isInline) {
                                return <code className="bg-slate-700/50 px-1 py-0.5 rounded text-amber-300 font-mono text-xs" {...props}>{children}</code>
                            }
                            return (
                                <CodeBlock 
                                    className={className} 
                                    onSave={onSaveSql} 
                                    children={children} 
                                    title={title}
                                />
                            )
                        }
                    }}
                >
                    {mainContent}
                </ReactMarkdown>
            </div>
            
            {analysisContent && (
                <AnalysisSection>
                    {analysisContent}
                </AnalysisSection>
            )}
          </>
      );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-800/80 backdrop-blur border-b border-slate-700 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-green-400" />
        <h2 className="font-semibold text-slate-100">SQL 生成控制台</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
            <Bot className="w-12 h-12 mb-4" />
            <p className="text-center max-w-sm">
              请在左侧导入表结构，然后在下方描述您的需求。
              <br />例如："查询所有并在过去 7 天内登录过的活跃用户。"
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
            )}
            
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.isError 
                    ? 'bg-red-900/20 border border-red-900/50 text-red-200' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                renderMessageContent(msg.content)
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-slate-300" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">正在分析表结构并生成优化 SQL...</span>
              </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="描述您的查询需求 (例如: 统计每个部门上个月的销售总额)..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-4 pr-12 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-400 hover:text-white disabled:text-slate-600 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};