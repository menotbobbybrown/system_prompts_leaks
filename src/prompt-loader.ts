import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DiscoveredPrompt {
  id: string; // e.g. "anthropic/claude-3-7-sonnet" or "cursor/cursor-composer"
  vendor: string; // e.g. "Anthropic"
  name: string; // e.g. "claude-3-7-sonnet"
  title: string;
  filePath: string;
  relativePath: string;
  description: string;
}

export class PromptLoader {
  private baseDir: string;
  private promptsCache: DiscoveredPrompt[] = [];

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else {
      // Resolve repo root directory safely in both ESM & CJS
      try {
        if (typeof import.meta !== 'undefined' && import.meta.url) {
          const currentFile = fileURLToPath(import.meta.url);
          this.baseDir = path.resolve(path.dirname(currentFile), '..');
        } else if (typeof __dirname !== 'undefined') {
          this.baseDir = path.resolve(__dirname, '..');
        } else {
          this.baseDir = process.cwd();
        }
      } catch {
        this.baseDir = process.cwd();
      }
    }
    this.scan();
  }

  public scan(): DiscoveredPrompt[] {
    const prompts: DiscoveredPrompt[] = [];
    const ignoredDirs = new Set(['.git', '.github', 'node_modules', 'dist', 'tests', 'assets']);

    const walk = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) {
            walk(path.join(currentDir, entry.name));
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          if (entry.name.toLowerCase() === 'readme.md' || entry.name.toLowerCase() === 'license.md') {
            continue;
          }

          const fullPath = path.join(currentDir, entry.name);
          const relPath = path.relative(this.baseDir, fullPath).replace(/\\/g, '/');
          const segments = relPath.split('/');

          const vendor = segments.length > 1 ? segments[0] : 'Misc';
          const promptName = path.basename(entry.name, '.md');
          const id = `${vendor.toLowerCase()}/${promptName.toLowerCase()}`;

          // Extract brief preview / title from file content
          let description = `System prompt for ${vendor} ${promptName}`;
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
            if (lines.length > 0) {
              const firstLine = lines[0].replace(/^#+\s*/, '');
              if (firstLine.length > 5) {
                description = firstLine.slice(0, 100);
              }
            }
          } catch {}

          prompts.push({
            id,
            vendor,
            name: promptName,
            title: `${vendor} — ${promptName}`,
            filePath: fullPath,
            relativePath: relPath,
            description,
          });
        }
      }
    };

    walk(this.baseDir);
    this.promptsCache = prompts.sort((a, b) => a.id.localeCompare(b.id));
    return this.promptsCache;
  }

  public getAllPrompts(): DiscoveredPrompt[] {
    if (this.promptsCache.length === 0) {
      this.scan();
    }
    return this.promptsCache;
  }

  public getPromptById(id: string): { prompt: DiscoveredPrompt; content: string } | undefined {
    const normalized = id.toLowerCase().trim();
    const prompt = this.getAllPrompts().find(
      (p) =>
        p.id === normalized ||
        p.name.toLowerCase() === normalized ||
        p.id.endsWith(`/${normalized}`)
    );

    if (!prompt) return undefined;

    // Security: Ensure target file stays strictly within the repository baseDir
    const resolvedTarget = path.resolve(prompt.filePath);
    const resolvedBase = path.resolve(this.baseDir);
    if (!resolvedTarget.startsWith(resolvedBase)) {
      throw new Error(`[Security] Path traversal violation: Attempted to access file outside base directory.`);
    }

    try {
      const content = fs.readFileSync(prompt.filePath, 'utf-8');
      return { prompt, content };
    } catch {
      return undefined;
    }
  }

  public searchPrompts(query: string): DiscoveredPrompt[] {
    const q = query.toLowerCase().trim();
    return this.getAllPrompts().filter(
      (p) =>
        p.id.includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
}
