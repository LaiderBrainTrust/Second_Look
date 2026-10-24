import { Router } from 'express';
import { agentTools } from '../shared/agent-tools.js';
export function mcpHelpRouter() {
 const router=Router();
 const guide=`# Connect an agent to Second Look

This is a public setup guide, not an MCP protocol endpoint. GET /mcp shows this guide; /mcp.json describes the connection. Do not put /mcp into a remote MCP client configuration.

Second Look currently supports a local stdio MCP bridge for Claude Code and Codex. It connects to the hosted application over HTTPS with a private, 24-hour key limited to one case and your existing role.

## Setup
1. Clone https://github.com/LaiderBrainTrust/Second_Look and open the repository.
2. Use Node.js 24. Run npm ci.
3. Set SECOND_LOOK_URL to the HTTPS origin serving this page, with no path. Run npm run connect:agent in your own interactive terminal.
4. Sign in to your individual account (or register with the team's enrollment code), select a case, and choose read or work scope.
5. Run the exact Claude Code or Codex MCP configuration command printed by setup. It uses absolute paths and an owner-only token file.
6. Ask your assistant: Read my Second Look case and compare its offers without changing anything.

Read scope cannot save changes. Work scope permits only your role's supported operations. No tool approves a decision, sends an offer, moves money, invites people or grants access. Confirm write effects before asking an assistant to perform them. Never paste passwords, enrollment codes, tokens or sponsor keys into a shared repository or chat. Your own terminal handles sign-in.

Keys expire in 24 hours. Setup prints the key ID and revocation route. Sign in and revoke that key, or change your password, to stop an existing connection. Deleting a local MCP entry alone is not revocation.

The HTTP /api/agent routes are the bridge's backend, not a remote MCP transport. Claude browser-only remote OAuth connection is not implemented.

## Optional Build with X1
X1 can supply selected, dated source excerpts to the case through a separately authorized read connection. X1 credentials never become Second Look agent credentials. Current setup, scope and limits: https://github.com/LaiderBrainTrust/Second_Look/blob/main/docs/X1_CONTEXT.md

Full guide: https://github.com/LaiderBrainTrust/Second_Look/blob/main/docs/MCP.md
`;
 const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 router.get(['/mcp','/mcp/'],(req,res)=>{
  res.setHeader('Cache-Control','public, max-age=60');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.accepts(['html','text'])==='text'){res.type('text/plain').send(guide);return;}
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connect your agent · Second Look</title><link rel="stylesheet" href="/mcp.css"><body><main><h1>Connect your agent to Second Look</h1><p>Public instructions for Claude Code and Codex. This page is not a remote MCP endpoint.</p><p><a href="/mcp.txt">Plain-text instructions</a> · <a href="/mcp.json">Connection metadata</a> · <a href="/">Open Second Look</a></p><pre>${escape(guide)}</pre></main></body></html>`);
 });
 router.get('/mcp.css',(_req,res)=>res.type('text/css').send('body{font-family:system-ui,sans-serif;max-width:850px;margin:3rem auto;padding:0 1.5rem;line-height:1.6;color:#21352e;background:#f7f6f0}pre{font-family:inherit;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#214e39}'));
 router.get(['/mcp.txt','/llms.txt'],(_req,res)=>res.type('text/plain').send(guide));
 router.get('/mcp.json',(_req,res)=>res.json({name:'Second Look',transport:'stdio',remoteMcpEndpoint:null,setupGuide:'/mcp.txt',repository:'https://github.com/LaiderBrainTrust/Second_Look',setupCommand:'npm run connect:agent',hostEnvironmentVariable:'SECOND_LOOK_URL',credentialEnvironmentVariable:'SECOND_LOOK_TOKEN_FILE',keyLifetimeHours:24,scopes:['read','work'],tools:Object.keys(agentTools),warning:'This JSON is connection documentation, not an MCP endpoint or a universal client config.'}));
 router.all(['/mcp','/mcp/'],(_req,res)=>{res.setHeader('Allow','GET, HEAD');res.status(405).json({error:'This is a setup guide, not a remote MCP endpoint.',guide:'/mcp.txt'});});
 return router;
}
