import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { actionableError, createNetlifyStores, readNetlifyConfig } from './netlify.js';
import { ProofOpsService } from './service.js';
import type { HandledStatus, ListRequestsResult, QueueStats, RequestSummary } from './types.js';

type Structured = Record<string, unknown>;

function result(text: string, structuredContent: Structured): CallToolResult {
  return {
    content: [{ type: 'text', text }],
    structuredContent
  };
}

function errorResult(error: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: actionableError(error) }],
    isError: true
  };
}

async function safely(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    return errorResult(error);
  }
}

function markdownValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function listMarkdown(response: ListRequestsResult): string {
  if (!response.requests.length) {
    return `No ${response.status === 'all' ? '' : `${response.status} `}proof requests found.`;
  }
  const rows = response.requests.map((request) => [
    request.created_at?.slice(0, 10) ?? '—',
    request.proof_ref ?? request.project_id,
    request.name || '—',
    request.photo_category || '—',
    request.finished_size_in == null ? '—' : `${request.finished_size_in}″`,
    request.handled ? 'handled' : 'new'
  ].map(markdownValue).join(' | '));
  return [
    `Found ${response.count} ${response.status === 'all' ? '' : `${response.status} `}proof request(s).`,
    '',
    'Created | Reference | Name | Category | Size | Status',
    '--- | --- | --- | --- | --- | ---',
    ...rows,
    response.next_cursor ? '\nMore requests are available; call again with next_cursor.' : ''
  ].filter(Boolean).join('\n');
}

function statusMarkdown(status: HandledStatus): string {
  const state = status.handled ? `handled at ${status.handled_at}` : 'new / unhandled';
  return `${status.project_id} is ${state}${status.note ? `. Note: ${status.note}` : '.'}`;
}

function statsMarkdown(stats: QueueStats): string {
  const age = stats.oldest_unhandled_age_hours == null
    ? 'No unhandled requests.'
    : `Oldest unhandled: ${stats.oldest_unhandled_age_hours} hours (${stats.oldest_unhandled_created_at}).`;
  return `Proof queue: ${stats.new} new, ${stats.handled} handled, ${stats.total} total. ${age}`;
}

export function createProofOpsServer(
  serviceFactory: () => ProofOpsService = () => new ProofOpsService(createNetlifyStores(readNetlifyConfig()))
): McpServer {
  const server = new McpServer(
    { name: 'mosapack-proof-ops', version: '0.1.0' },
    {
      instructions:
        'Use proofops_list_requests to inspect the queue, proofops_get_request and proofops_get_preview ' +
        'to review a design, then mark it handled only after Derek confirms the proof work is complete.'
    }
  );
  const service = () => serviceFactory();

  server.registerTool(
    'proofops_list_requests',
    {
      title: 'List proof requests',
      description:
        'List MosaPack proof requests in newest-first order, joined with local handled status. ' +
        'Returns compact metadata only and never includes image data.',
      inputSchema: z.object({
        status: z.enum(['new', 'handled', 'all']).default('new'),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().min(1).optional()
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (input) => safely(async () => {
      const response = await service().listRequests(input);
      return result(listMarkdown(response), { ...response });
    })
  );

  server.registerTool(
    'proofops_get_request',
    {
      title: 'Get proof request',
      description:
        'Get one stored proof request and its handled status. Omits the large tile_map unless explicitly requested.',
      inputSchema: z.object({
        project_id: z.string().min(1).max(200),
        include_tile_map: z.boolean().default(false)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ project_id, include_tile_map }) => safely(async () => {
      const response = await service().getRequest(project_id, include_tile_map);
      const request = response.request;
      const text = [
        `Proof request ${markdownValue(request.proof_ref ?? project_id)}`,
        `Customer: ${markdownValue(request.name)} <${markdownValue(request.email)}>`,
        `Category: ${markdownValue(request.photo_category)}`,
        `Grid / size: ${markdownValue(request.grid_size)} / ${markdownValue(request.finished_size_in)}″`,
        `Status: ${response.status.handled ? 'handled' : 'new'}`
      ].join('\n');
      return result(text, { request, status: response.status });
    })
  );

  server.registerTool(
    'proofops_get_preview',
    {
      title: 'View proof image',
      description:
        'Return the saved mosaic preview or cropped source as MCP image content so the design can be visually reviewed.',
      inputSchema: z.object({
        project_id: z.string().min(1).max(200),
        asset: z.enum(['preview', 'cropped_source']).default('preview')
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ project_id, asset }) => safely(async () => {
      const preview = await service().getPreview(project_id, asset);
      const metadata = {
        project_id: preview.project_id,
        asset: preview.asset,
        key: preview.key,
        mime: preview.mime,
        bytes: preview.bytes
      };
      return {
        content: [
          {
            type: 'text',
            text: `${asset} for ${project_id}: ${preview.bytes} bytes (${preview.mime}).`
          },
          {
            type: 'image',
            data: Buffer.from(preview.data).toString('base64'),
            mimeType: preview.mime
          }
        ],
        structuredContent: metadata
      };
    })
  );

  server.registerTool(
    'proofops_mark_handled',
    {
      title: 'Mark proof request handled',
      description:
        'Idempotently mark a proof request handled in mosapack-ops. Does not modify the saved project or image stores.',
      inputSchema: z.object({
        project_id: z.string().min(1).max(200),
        note: z.string().max(2000).optional()
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ project_id, note }) => safely(async () => {
      const status = await service().markHandled(project_id, note);
      return result(statusMarkdown(status), { status });
    })
  );

  server.registerTool(
    'proofops_mark_unhandled',
    {
      title: 'Mark proof request unhandled',
      description:
        'Idempotently return a proof request to the new queue in mosapack-ops, optionally recording a note.',
      inputSchema: z.object({
        project_id: z.string().min(1).max(200),
        note: z.string().max(2000).optional()
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ project_id, note }) => safely(async () => {
      const status = await service().markUnhandled(project_id, note);
      return result(statusMarkdown(status), { status });
    })
  );

  server.registerTool(
    'proofops_queue_stats',
    {
      title: 'Proof queue statistics',
      description:
        'Count new and handled proof requests and report the age of the oldest unhandled request for SLA monitoring.',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async () => safely(async () => {
      const stats = await service().queueStats();
      return result(statsMarkdown(stats), { stats });
    })
  );

  return server;
}
