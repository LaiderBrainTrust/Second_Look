import { McpServer } from '@modelcontextprotocol/server';
import { agentTools, type AgentToolName } from '../shared/agent-tools.js';

export function createSecondLookMcp(call: (tool: AgentToolName, input: Record<string, unknown>) => Promise<unknown>) {
  const server = new McpServer({ name: 'second-look-mcp-server', version: '0.1.0' });
  for (const [name, tool] of Object.entries(agentTools)) {
    server.registerTool(name, {
      title: name.replaceAll('_', ' '), description: tool.description,
      inputSchema: tool.schema,
      annotations: { readOnlyHint: !tool.write, destructiveHint: tool.write, idempotentHint: !tool.write, openWorldHint: false },
    }, async (input: Record<string, unknown>) => {
      try {
        const result = await call(name as AgentToolName, input);
        const text = JSON.stringify(result);
        if (text.length > 25000) return { isError: true, content: [{ type: 'text' as const, text: 'Result exceeds the response limit. Use question pagination or open this case in the app.' }] };
        return { content: [{ type: 'text' as const, text }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text' as const, text: error instanceof Error ? error.message : 'Request failed. Reopen the case to check the current state before retrying.' }] };
      }
    });
  }
  return server;
}
