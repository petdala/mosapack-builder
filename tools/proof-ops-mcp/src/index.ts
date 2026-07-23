#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createProofOpsServer } from './server.js';

const server = createProofOpsServer();
const transport = new StdioServerTransport();

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

server.connect(transport).catch((error) => {
  console.error('MosaPack proof-ops MCP server failed:', error);
  process.exit(1);
});
