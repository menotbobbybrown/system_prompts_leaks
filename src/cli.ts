#!/usr/bin/env node

import { PromptLoader } from './prompt-loader.js';
import { SystemPromptsMcpServer } from './server.js';

export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  const loader = new PromptLoader();

  if (command === 'serve' || command === 'start') {
    const server = new SystemPromptsMcpServer(loader);
    await server.start();
    return;
  }

  if (command === 'list') {
    const filterVendor = args[1]?.toLowerCase();
    let prompts = loader.getAllPrompts();
    if (filterVendor) {
      prompts = prompts.filter((p) => p.vendor.toLowerCase() === filterVendor);
    }

    console.log(`\n📚 Discovered System Prompts (${prompts.length} total):\n`);
    for (const p of prompts) {
      console.log(`  • \x1b[36m${p.id.padEnd(35)}\x1b[0m \x1b[90m(${p.vendor})\x1b[0m`);
      console.log(`    \x1b[37m${p.description}\x1b[0m\n`);
    }
    console.log(`💡 To inspect a prompt: npx system-prompts-mcp get <id>`);
    console.log(`🚀 To run as MCP server: npx system-prompts-mcp serve\n`);
    return;
  }

  if (command === 'get' || command === 'view') {
    const id = args[1];
    if (!id) {
      console.error('Usage: system-prompts-mcp get <prompt-id>');
      process.exit(1);
    }

    const result = loader.getPromptById(id);
    if (!result) {
      console.error(`Prompt "${id}" not found. Run "system-prompts-mcp list" to see available IDs.`);
      process.exit(1);
    }

    console.log(`\n=== [${result.prompt.title}] ===\n`);
    console.log(result.content);
    return;
  }

  if (command === 'search') {
    const q = args.slice(1).join(' ');
    if (!q) {
      console.error('Usage: system-prompts-mcp search <keyword>');
      process.exit(1);
    }

    const matches = loader.searchPrompts(q);
    console.log(`\n🔍 Found ${matches.length} matching prompts for "${q}":\n`);
    for (const p of matches) {
      console.log(`  • \x1b[36m${p.id.padEnd(35)}\x1b[0m \x1b[90m(${p.vendor})\x1b[0m`);
      console.log(`    \x1b[37m${p.description}\x1b[0m\n`);
    }
    return;
  }

  console.log(`
system-prompts-mcp — Universal System Prompts & AI Personas MCP Server

Usage:
  system-prompts-mcp list [vendor]     List all discovered system prompts
  system-prompts-mcp get <id>          Display the full system prompt markdown
  system-prompts-mcp search <query>    Search system prompts by keyword
  system-prompts-mcp serve             Start MCP server over stdio for AI Agents
  `);
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('cli.cjs') || process.argv[1]?.includes('system-prompts-mcp')) {
  runCli().catch((err) => {
    console.error('[system-prompts-mcp] Error:', err);
    process.exit(1);
  });
}
