export { runCli } from './cli.js';

interface DiscoveredPrompt {
    id: string;
    vendor: string;
    name: string;
    title: string;
    filePath: string;
    relativePath: string;
    description: string;
}
declare class PromptLoader {
    private baseDir;
    private promptsCache;
    constructor(baseDir?: string);
    scan(): DiscoveredPrompt[];
    getAllPrompts(): DiscoveredPrompt[];
    getPromptById(id: string): {
        prompt: DiscoveredPrompt;
        content: string;
    } | undefined;
    searchPrompts(query: string): DiscoveredPrompt[];
}

declare class SystemPromptsMcpServer {
    private server;
    private loader;
    constructor(loader?: PromptLoader);
    private setupHandlers;
    start(): Promise<void>;
}

export { type DiscoveredPrompt, PromptLoader, SystemPromptsMcpServer };
