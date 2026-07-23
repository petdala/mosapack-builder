# MosaPack Proof Ops MCP

Local stdio MCP server for reviewing the MosaPack proof queue with Derek. It reads proof JSON from
`mosapack-projects`, reads images from `mosapack-project-assets`, and writes handled status only to
`mosapack-ops`.

## Requirements

- Node.js 20 or newer
- `NETLIFY_SITE_ID=6ed95826-19fd-445c-8b01-f934d0f15b4d`
- `NETLIFY_AUTH_TOKEN` from a Netlify personal access token

Never commit the token or paste it into chat.

## Install, build, and test

```bash
cd /Users/dereksolas/Developer/mosapack-clean/tools/proof-ops-mcp
npm install
npm run build
npm test
```

Run directly:

```bash
NETLIFY_SITE_ID=6ed95826-19fd-445c-8b01-f934d0f15b4d \
NETLIFY_AUTH_TOKEN='your-token' \
node dist/index.js
```

The server uses stdio. Do not write ordinary logs to stdout because that channel carries MCP JSON-RPC.

## Claude Desktop / Cowork configuration

Build the package first, then add this exact entry to the local MCP configuration. On macOS, Claude
Desktop's file is normally `~/Library/Application Support/Claude/claude_desktop_config.json`. Cowork's
local MCP settings accept the same `mcpServers` entry.

```json
{
  "mcpServers": {
    "mosapack-proof-ops": {
      "command": "node",
      "args": [
        "/Users/dereksolas/Developer/mosapack-clean/tools/proof-ops-mcp/dist/index.js"
      ],
      "env": {
        "NETLIFY_SITE_ID": "6ed95826-19fd-445c-8b01-f934d0f15b4d",
        "NETLIFY_AUTH_TOKEN": "PASTE_NETLIFY_PERSONAL_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

Restart Claude Desktop or Cowork after changing the configuration. Keep the token only in the local
configuration and restrict access to that file.

## Create the Netlify personal access token

1. Sign in to Netlify as a user who can access the MosaPack site.
2. Open **User settings → Applications → Personal access tokens**.
3. Select **New access token**.
4. Name it `MosaPack proof ops`, choose an expiration date, and grant the MosaPack team if Netlify asks.
5. Generate and copy the token immediately; Netlify will not show it again.
6. Put it in the MCP configuration as `NETLIFY_AUTH_TOKEN`.

If Netlify uses SSO for the team, explicitly grant the token access to that team. A 401 from a tool
usually means the token expired, was revoked, or lacks team access.

## Tools

- `proofops_list_requests`: newest-first queue with `new`, `handled`, or `all` filtering.
- `proofops_get_request`: stored request details; omits `tile_map` unless requested.
- `proofops_get_preview`: preview or cropped-source image as MCP image content.
- `proofops_mark_handled`: idempotently mark a request handled in `mosapack-ops`.
- `proofops_mark_unhandled`: return a request to the new queue in `mosapack-ops`.
- `proofops_queue_stats`: new/handled counts and oldest-unhandled age.

The two proof stores are read-only in this package. Only `mosapack-ops` is writable.
