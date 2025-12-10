import { TableDefinition } from '../types';

/**
 * Extracts table names and separates DDL statements from a raw SQL string.
 * This is a simplified parser intended for standard MySQL dumps.
 */
export const parseSqlSchemas = (rawSql: string): TableDefinition[] => {
  const definitions: TableDefinition[] = [];
  
  // Clean up comments roughly
  const cleanSql = rawSql
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
    .replace(/--.*$/gm, ''); // remove single line comments

  // Split by semicolon to get potential statements, filter for CREATE TABLE
  // Note: Splitting by semicolon is a heuristic that works for most DDL dumps.
  const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);

  // Regex to extract table name
  // Fixed: The prefix group (?:`?[\w-]+`?\.)? now strictly requires a dot `\.`.
  // This prevents it from greedily consuming the table name when no prefix is present.
  const tableNameRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?[\w-]+`?\.)?`?([\w-]+)`?/i;

  statements.forEach(statement => {
    // Check if it starts with CREATE TABLE (case insensitive)
    if (/^CREATE\s+TABLE/i.test(statement)) {
      const tableNameMatch = statement.match(tableNameRegex);
      
      if (tableNameMatch && tableNameMatch[1]) {
        definitions.push({
          id: crypto.randomUUID(),
          name: tableNameMatch[1],
          ddl: statement + ';', // Add semicolon back for correctness
        });
      }
    }
  });

  return definitions;
};