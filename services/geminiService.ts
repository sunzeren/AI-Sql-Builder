import { GoogleGenAI } from "@google/genai";
import { TableDefinition } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const autoGenerateTags = async (tables: TableDefinition[], tagLibrary: string[]): Promise<Record<string, string[]>> => {
    if (tables.length === 0) return {};

    // Batch tables to avoid hitting API payload limits or timeouts (Error Code 6)
    const BATCH_SIZE = 5;
    const batches = [];
    for (let i = 0; i < tables.length; i += BATCH_SIZE) {
        batches.push(tables.slice(i, i + BATCH_SIZE));
    }

    let allTags: Record<string, string[]> = {};
    const libraryStr = tagLibrary.length > 0 ? tagLibrary.join(', ') : "无预设标签";

    // Process batches sequentially
    for (const batch of batches) {
        // Optimization: Extract minimal schema info to reduce token count
        const schemaSummary = batch.map(t => {
            // Heuristic: Extract text inside backticks (usually columns/tables) or fallback to truncated DDL
            // This significantly reduces payload size compared to sending full DDLs with comments
            const match = t.ddl.match(/`[^`]+`/g);
            const content = match ? match.slice(0, 100).join(', ') : t.ddl.substring(0, 500).replace(/\n/g, ' ');
            return `Table: ${t.name}\nColumns/Keywords: ${content}`;
        }).join('\n---\n');

        const prompt = `
你是一个专业的数据库管理员。请分析以下数据库表的名称和结构，从给定的【标签库】中选择最合适的标签。

规则：
1. **优先使用标签库**：尽量只使用【标签库】中已有的标签。
2. **数量灵活**：每个表生成 0-3 个标签。只打强相关的标签，如果都不相关，可以不打标签（返回空数组）。
3. **返回格式**：必须是纯 JSON：{"tableName": ["tag1", "tag2"]}

【标签库】：
${libraryStr}

表结构概要 (Batch):
${schemaSummary}
`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });
            
            const result = JSON.parse(response.text || "{}");
            allTags = { ...allTags, ...result };
        } catch (e) {
            console.error("Batch auto-tagging failed", e);
            // Continue to next batch instead of failing completely
        }
    }

    return allTags;
};

export const generateSqlFromRequirement = async (
  tables: TableDefinition[],
  requirement: string
): Promise<string> => {
  if (tables.length === 0) {
    throw new Error("请先导入表结构。");
  }

  const schemaContext = tables.map(t => {
      const tagsInfo = t.tags && t.tags.length > 0 ? ` [Tags: ${t.tags.join(', ')}]` : '';
      return `Table: ${t.name}${tagsInfo}\nDDL:\n${t.ddl}`;
  }).join('\n\n');

  const systemInstruction = `
你是一位精通 MySQL 的高级数据库架构师。
你的任务是根据用户提供的数据库表结构 (DDL) 和自然语言需求，编写高质量、高性能的 SQL 查询语句。

请遵循以下严格的风格与输出规则：

1. **SQL 风格规范** (必须严格遵守):
   - **字段别名**：必须使用 **CamelCase (小驼峰)** 命名法 (例如: \`userName\`, \`createTime\`)。
   - **表别名**：必须按出现顺序使用 **t1, t2, t3...** (例如: \`FROM users t1 JOIN orders t2 ON...\`)。
   - **注释规范**：**禁止**显而易见的冗余注释。但是，对于**复杂的关联逻辑、特殊的过滤条件、或者隐含的业务规则**，**必须**在代码中添加简短注释进行说明，以保证代码的可维护性。
   - **性能优先**：避免 \`SELECT *\`，只查询需要的字段；避免在索引列上进行函数计算。

2. **输出格式规范**:
   - **标题行**：第一行必须包含 SQL 的简短名称，格式为：\`<!-- TITLE: 你的简短标题 -->\`。
   - **SQL 代码块**：标题行紧接着，**必须**使用 Markdown 代码块 (\`\`\`sql) 包裹 SQL 语句。
   - **分析分隔**：在 SQL 代码块之后，必须严格使用一行 \`<!-- ANALYSIS_START -->\` 作为分隔符。
   - **结构化分析**：在分隔符之后，使用 Markdown 的 H3 标题 (\`###\`) 对建议进行分类。
     - \`### 🛑 关键风险\`
     - \`### 💡 优化建议\`
     - \`### 📝 逻辑说明\`

3. **业务感知**：利用表的 [Tags] 信息辅助理解业务。

示例 SQL 风格：
\`\`\`sql
SELECT 
  t1.user_id AS userId,
  t1.user_name AS userName,
  -- 仅统计已支付的订单 (status=1)
  COUNT(t2.order_id) AS orderCount
FROM users t1
LEFT JOIN orders t2 ON t1.id = t2.user_id AND t2.status = 1
GROUP BY t1.id
\`\`\`
`;

  const prompt = `
现有以下 MySQL 表结构：
${schemaContext}

---
用户需求：
${requirement}

---
请给出最优 SQL 及简要分析。
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "无法生成回复，请重试。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("生成 SQL 失败，请检查网络或 API Key 设置。");
  }
};