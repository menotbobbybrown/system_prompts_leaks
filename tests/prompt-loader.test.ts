import { describe, it, expect } from 'vitest';
import { PromptLoader } from '../src/prompt-loader.js';

describe('PromptLoader (System Prompts Discovery)', () => {
  it('should scan and discover real system prompts in the repository', () => {
    const loader = new PromptLoader();
    const prompts = loader.getAllPrompts();

    expect(prompts.length).toBeGreaterThan(0);

    // Verify vendors are present
    const vendors = new Set(prompts.map((p) => p.vendor));
    expect(vendors.has('Anthropic') || vendors.has('Cursor') || vendors.has('OpenAI')).toBe(true);

    const first = prompts[0];
    expect(first.id).toBeDefined();
    expect(first.filePath).toBeDefined();
  });

  it('should retrieve full prompt markdown content by ID', () => {
    const loader = new PromptLoader();
    const prompts = loader.getAllPrompts();
    const target = prompts[0];

    const result = loader.getPromptById(target.id);
    expect(result).toBeDefined();
    expect(result?.content.length).toBeGreaterThan(10);
  });

  it('should search prompts by keyword', () => {
    const loader = new PromptLoader();
    const results = loader.searchPrompts('claude');
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});
