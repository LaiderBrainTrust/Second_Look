import { expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { resolve } from 'node:path';

it('negotiates actual MCP stdio, advertises schemas, rejects invalid input and reports permission errors', async () => {
  const client = new Client({name:'second-look-protocol-test',version:'1.0.0'});
  const transport = new StdioClientTransport({command:process.execPath,args:['--import','tsx',resolve('tests/fixtures/mcp-server.ts')],stderr:'pipe'});
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(7);
    expect(tools.tools.find(t=>t.name==='secondlook_compare_offers')?.annotations?.readOnlyHint).toBe(true);
    expect(tools.tools.some(t=>t.name.includes('approve'))).toBe(false);
    const read = await client.callTool({name:'secondlook_read_case',arguments:{}});
    expect(read.isError).not.toBe(true); expect(JSON.stringify(read.content)).toContain('secondlook_read_case');
    const invalid = await client.callTool({name:'secondlook_read_case',arguments:{caseId:'another-case'}});
    expect(invalid.isError).toBe(true);
    const denied = await client.callTool({name:'secondlook_request_distribution',arguments:{expectedRevision:1}});
    expect(denied.isError).toBe(true); expect(JSON.stringify(denied.content)).toContain('read-only');
  } finally { await client.close(); }
},15000);
