import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createSecondLookMcp } from '../../server/mcp.js';
const server = createSecondLookMcp(async (tool, input) => {
  if (tool === 'secondlook_request_distribution') throw new Error('This connection is read-only.');
  return { tool, input, synthetic: true };
});
await server.connect(new StdioServerTransport());
