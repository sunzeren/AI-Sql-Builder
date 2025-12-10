export interface TableDefinition {
  id: string;
  name: string;
  ddl: string;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

export interface GenerationRequest {
  schemas: TableDefinition[];
  requirement: string;
}

export interface SavedSql {
  id: string;
  name: string;
  code: string;
  timestamp: number;
}