#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/cli.ts
var cli_exports = {};
__export(cli_exports, {
  runCli: () => runCli
});
module.exports = __toCommonJS(cli_exports);

// src/prompt-loader.ts
var import_node_fs = __toESM(require("fs"), 1);
var import_node_path = __toESM(require("path"), 1);
var import_node_url = require("url");
var import_meta = {};
var PromptLoader = class {
  baseDir;
  promptsCache = [];
  constructor(baseDir) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else {
      try {
        if (typeof import_meta !== "undefined" && import_meta.url) {
          const currentFile = (0, import_node_url.fileURLToPath)(import_meta.url);
          this.baseDir = import_node_path.default.resolve(import_node_path.default.dirname(currentFile), "..");
        } else if (typeof __dirname !== "undefined") {
          this.baseDir = import_node_path.default.resolve(__dirname, "..");
        } else {
          this.baseDir = process.cwd();
        }
      } catch {
        this.baseDir = process.cwd();
      }
    }
    this.scan();
  }
  scan() {
    const prompts = [];
    const ignoredDirs = /* @__PURE__ */ new Set([".git", ".github", "node_modules", "dist", "tests", "assets"]);
    const walk = (currentDir) => {
      if (!import_node_fs.default.existsSync(currentDir)) return;
      const entries = import_node_fs.default.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) {
            walk(import_node_path.default.join(currentDir, entry.name));
          }
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          if (entry.name.toLowerCase() === "readme.md" || entry.name.toLowerCase() === "license.md") {
            continue;
          }
          const fullPath = import_node_path.default.join(currentDir, entry.name);
          const relPath = import_node_path.default.relative(this.baseDir, fullPath).replace(/\\/g, "/");
          const segments = relPath.split("/");
          const vendor = segments.length > 1 ? segments[0] : "Misc";
          const promptName = import_node_path.default.basename(entry.name, ".md");
          const id = `${vendor.toLowerCase()}/${promptName.toLowerCase()}`;
          let description = `System prompt for ${vendor} ${promptName}`;
          try {
            const content = import_node_fs.default.readFileSync(fullPath, "utf-8");
            const lines = content.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
            if (lines.length > 0) {
              const firstLine = lines[0].replace(/^#+\s*/, "");
              if (firstLine.length > 5) {
                description = firstLine.slice(0, 100);
              }
            }
          } catch {
          }
          prompts.push({
            id,
            vendor,
            name: promptName,
            title: `${vendor} \u2014 ${promptName}`,
            filePath: fullPath,
            relativePath: relPath,
            description
          });
        }
      }
    };
    walk(this.baseDir);
    this.promptsCache = prompts.sort((a, b) => a.id.localeCompare(b.id));
    return this.promptsCache;
  }
  getAllPrompts() {
    if (this.promptsCache.length === 0) {
      this.scan();
    }
    return this.promptsCache;
  }
  getPromptById(id) {
    const normalized = id.toLowerCase().trim();
    const prompt = this.getAllPrompts().find(
      (p) => p.id === normalized || p.name.toLowerCase() === normalized || p.id.endsWith(`/${normalized}`)
    );
    if (!prompt) return void 0;
    const resolvedTarget = import_node_path.default.resolve(prompt.filePath);
    const resolvedBase = import_node_path.default.resolve(this.baseDir);
    if (!resolvedTarget.startsWith(resolvedBase)) {
      throw new Error(`[Security] Path traversal violation: Attempted to access file outside base directory.`);
    }
    try {
      const content = import_node_fs.default.readFileSync(prompt.filePath, "utf-8");
      return { prompt, content };
    } catch {
      return void 0;
    }
  }
  searchPrompts(query) {
    const q = query.toLowerCase().trim();
    return this.getAllPrompts().filter(
      (p) => p.id.includes(q) || p.vendor.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }
};

// src/server.ts
var import_server = require("@modelcontextprotocol/sdk/server/index.js");
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");
var import_types = require("@modelcontextprotocol/sdk/types.js");
var SystemPromptsMcpServer = class {
  server;
  loader;
  constructor(loader) {
    this.loader = loader || new PromptLoader();
    this.server = new import_server.Server(
      {
        name: "system-prompts-mcp",
        version: "0.1.0"
      },
      {
        capabilities: {
          prompts: {},
          tools: {}
        }
      }
    );
    this.setupHandlers();
  }
  setupHandlers() {
    this.server.setRequestHandler(import_types.ListPromptsRequestSchema, async () => {
      const all = this.loader.getAllPrompts();
      return {
        prompts: all.map((p) => ({
          name: p.id,
          description: p.description,
          arguments: [
            {
              name: "user_task",
              description: "Optional custom task or prompt context to append to the system persona",
              required: false
            }
          ]
        }))
      };
    });
    this.server.setRequestHandler(import_types.GetPromptRequestSchema, async (request) => {
      const promptId = request.params.name;
      const found = this.loader.getPromptById(promptId);
      if (!found) {
        throw new Error(`System prompt "${promptId}" not found.`);
      }
      const userTask = request.params.arguments?.user_task;
      const messages = [
        {
          role: "user",
          content: {
            type: "text",
            text: found.content + (userTask ? `

--- User Task Context ---
${userTask}` : "")
          }
        }
      ];
      return {
        description: found.prompt.description,
        messages
      };
    });
    this.server.setRequestHandler(import_types.ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "list_system_prompts",
            description: "List all available AI system prompts and personas categorized by vendor (Anthropic, OpenAI, Cursor, DeepSeek, Google, etc.).",
            inputSchema: {
              type: "object",
              properties: {
                vendor: {
                  type: "string",
                  description: 'Filter by vendor name (e.g. "Anthropic", "Cursor", "OpenAI", "DeepSeek")'
                }
              }
            }
          },
          {
            name: "get_system_prompt",
            description: "Get the full system prompt markdown instructions for a specific model or assistant persona.",
            inputSchema: {
              type: "object",
              properties: {
                prompt_id: {
                  type: "string",
                  description: 'Prompt ID or name (e.g. "anthropic/claude-3-7-sonnet", "cursor/cursor-composer", "openai/o3-mini")'
                }
              },
              required: ["prompt_id"]
            }
          },
          {
            name: "search_system_prompts",
            description: 'Search for system prompts matching a keyword or use case (e.g. "coding", "agent", "reasoning").',
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search keyword"
                }
              },
              required: ["query"]
            }
          }
        ]
      };
    });
    this.server.setRequestHandler(import_types.CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};
      if (toolName === "list_system_prompts") {
        const vendor = typeof args.vendor === "string" ? args.vendor.toLowerCase() : void 0;
        let prompts = this.loader.getAllPrompts();
        if (vendor) {
          prompts = prompts.filter((p) => p.vendor.toLowerCase() === vendor);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                prompts.map((p) => ({
                  id: p.id,
                  vendor: p.vendor,
                  name: p.name,
                  description: p.description
                })),
                null,
                2
              )
            }
          ]
        };
      }
      if (toolName === "get_system_prompt") {
        const promptId = String(args.prompt_id);
        const found = this.loader.getPromptById(promptId);
        if (!found) {
          return {
            isError: true,
            content: [{ type: "text", text: `Prompt "${promptId}" not found.` }]
          };
        }
        return {
          content: [{ type: "text", text: found.content }]
        };
      }
      if (toolName === "search_system_prompts") {
        const query = String(args.query || "");
        const results = this.loader.searchPrompts(query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                results.map((p) => ({
                  id: p.id,
                  vendor: p.vendor,
                  name: p.name,
                  description: p.description
                })),
                null,
                2
              )
            }
          ]
        };
      }
      throw new Error(`Unknown tool: ${toolName}`);
    });
  }
  async start() {
    const transport = new import_stdio.StdioServerTransport();
    await this.server.connect(transport);
  }
};

// src/cli.ts
async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0] || "list";
  const loader = new PromptLoader();
  if (command === "serve" || command === "start") {
    const server = new SystemPromptsMcpServer(loader);
    await server.start();
    return;
  }
  if (command === "list") {
    const filterVendor = args[1]?.toLowerCase();
    let prompts = loader.getAllPrompts();
    if (filterVendor) {
      prompts = prompts.filter((p) => p.vendor.toLowerCase() === filterVendor);
    }
    console.log(`
\u{1F4DA} Discovered System Prompts (${prompts.length} total):
`);
    for (const p of prompts) {
      console.log(`  \u2022 \x1B[36m${p.id.padEnd(35)}\x1B[0m \x1B[90m(${p.vendor})\x1B[0m`);
      console.log(`    \x1B[37m${p.description}\x1B[0m
`);
    }
    console.log(`\u{1F4A1} To inspect a prompt: npx system-prompts-mcp get <id>`);
    console.log(`\u{1F680} To run as MCP server: npx system-prompts-mcp serve
`);
    return;
  }
  if (command === "get" || command === "view") {
    const id = args[1];
    if (!id) {
      console.error("Usage: system-prompts-mcp get <prompt-id>");
      process.exit(1);
    }
    const result = loader.getPromptById(id);
    if (!result) {
      console.error(`Prompt "${id}" not found. Run "system-prompts-mcp list" to see available IDs.`);
      process.exit(1);
    }
    console.log(`
=== [${result.prompt.title}] ===
`);
    console.log(result.content);
    return;
  }
  if (command === "search") {
    const q = args.slice(1).join(" ");
    if (!q) {
      console.error("Usage: system-prompts-mcp search <keyword>");
      process.exit(1);
    }
    const matches = loader.searchPrompts(q);
    console.log(`
\u{1F50D} Found ${matches.length} matching prompts for "${q}":
`);
    for (const p of matches) {
      console.log(`  \u2022 \x1B[36m${p.id.padEnd(35)}\x1B[0m \x1B[90m(${p.vendor})\x1B[0m`);
      console.log(`    \x1B[37m${p.description}\x1B[0m
`);
    }
    return;
  }
  console.log(`
system-prompts-mcp \u2014 Universal System Prompts & AI Personas MCP Server

Usage:
  system-prompts-mcp list [vendor]     List all discovered system prompts
  system-prompts-mcp get <id>          Display the full system prompt markdown
  system-prompts-mcp search <query>    Search system prompts by keyword
  system-prompts-mcp serve             Start MCP server over stdio for AI Agents
  `);
}
if (process.argv[1]?.endsWith("cli.js") || process.argv[1]?.endsWith("cli.cjs") || process.argv[1]?.includes("system-prompts-mcp")) {
  runCli().catch((err) => {
    console.error("[system-prompts-mcp] Error:", err);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runCli
});
