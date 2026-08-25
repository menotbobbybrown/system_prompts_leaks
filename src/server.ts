import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PromptLoader } from './prompt-loader.js';

export class SystemPromptsMcpServer {
  private server: Server;
  private loader: PromptLoader;

  constructor(loader?: PromptLoader) {
    this.loader = loader || new PromptLoader();
    this.server = new Server(
      {
        name: 'system-prompts-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          prompts: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 1. MCP Prompts: List all available system prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const all = this.loader.getAllPrompts();
      return {
        prompts: all.map((p) => ({
          name: p.id,
          description: p.description,
          arguments: [
            {
              name: 'user_task',
              description: 'Optional custom task or prompt context to append to the system persona',
              required: false,
            },
          ],
        })),
      };
    });

    // 2. MCP Prompts: Get specific prompt content
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const promptId = request.params.name;
      const found = this.loader.getPromptById(promptId);

      if (!found) {
        throw new Error(`System prompt "${promptId}" not found.`);
      }

      const userTask = request.params.arguments?.user_task;
      const messages: any[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: found.content + (userTask ? `\n\n--- User Task Context ---\n${userTask}` : ''),
          },
        },
      ];

      return {
        description: found.prompt.description,
        messages,
      };
    });

    // 3. MCP Tools: List search & query tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_system_prompts',
            description: 'List all available AI system prompts and personas categorized by vendor (Anthropic, OpenAI, Cursor, DeepSeek, Google, etc.).',
            inputSchema: {
              type: 'object',
              properties: {
                vendor: {
                  type: 'string',
                  description: 'Filter by vendor name (e.g. "Anthropic", "Cursor", "OpenAI", "DeepSeek")',
                },
              },
            },
          },
          {
            name: 'get_system_prompt',
            description: 'Get the full system prompt markdown instructions for a specific model or assistant persona.',
            inputSchema: {
              type: 'object',
              properties: {
                prompt_id: {
                  type: 'string',
                  description: 'Prompt ID or name (e.g. "anthropic/claude-3-7-sonnet", "cursor/cursor-composer", "openai/o3-mini")',
                },
              },
              required: ['prompt_id'],
            },
          },
          {
            name: 'search_system_prompts',
            description: 'Search for system prompts matching a keyword or use case (e.g. "coding", "agent", "reasoning").',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search keyword',
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // 4. MCP Tools: Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      if (toolName === 'list_system_prompts') {
        const vendor = typeof args.vendor === 'string' ? args.vendor.toLowerCase() : undefined;
        let prompts = this.loader.getAllPrompts();
        if (vendor) {
          prompts = prompts.filter((p) => p.vendor.toLowerCase() === vendor);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                prompts.map((p) => ({
                  id: p.id,
                  vendor: p.vendor,
                  name: p.name,
                  description: p.description,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      if (toolName === 'get_system_prompt') {
        const promptId = String(args.prompt_id);
        const found = this.loader.getPromptById(promptId);
        if (!found) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Prompt "${promptId}" not found.` }],
          };
        }
        return {
          content: [{ type: 'text', text: found.content }],
        };
      }

      if (toolName === 'search_system_prompts') {
        const query = String(args.query || '');
        const results = this.loader.searchPrompts(query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                results.map((p) => ({
                  id: p.id,
                  vendor: p.vendor,
                  name: p.name,
                  description: p.description,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${toolName}`);
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
