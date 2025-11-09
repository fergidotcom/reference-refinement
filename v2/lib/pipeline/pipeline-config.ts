/**
 * Reference Refinement v2 - Pipeline Configuration
 *
 * Complete configuration for the entire reference refinement pipeline.
 * Combines settings for all components.
 */

import { z } from 'zod';
import { parse as parseYAML } from 'yaml';
import * as fs from 'fs/promises';

/**
 * Pipeline configuration schema (Zod validation)
 */
export const PipelineConfigSchema = z.object({
  // API Keys
  google_api_key: z.string().min(1),
  google_cse_id: z.string().min(1),
  anthropic_api_key: z.string().min(1),

  // Search Settings
  search: z.object({
    queries_per_reference: z.number().int().min(1).max(20).default(8),
    primary_queries: z.number().int().min(0).max(10).default(4),
    secondary_queries: z.number().int().min(0).max(10).default(4),
    results_per_query: z.number().int().min(1).max(10).default(10),
  }),

  // Refinement Settings
  refinement: z.object({
    validate_top_n: z.number().int().min(1).max(50).default(20),
    primary_threshold: z.number().int().min(0).max(100).default(75),
    secondary_threshold: z.number().int().min(0).max(100).default(75),
    enhanced_soft_404: z.boolean().default(true),
  }),

  // Rate Limiting
  rate_limiting: z.object({
    google_max_per_day: z.number().int().min(1).default(100),
    google_max_per_second: z.number().min(0).default(1),
    delay_after_search: z.number().int().min(0).default(1000), // ms
    delay_after_validation: z.number().int().min(0).default(200), // ms
    timeout: z.number().int().min(1000).default(10000), // ms
  }),

  // Output Settings
  output: z.object({
    format: z.enum(['decisions', 'final', 'json', 'markdown']).default('decisions'),
    path: z.string().default('./output/decisions.txt'),
    batch_version: z.string().default('v2.0'),
    auto_finalize: z.boolean().default(false),
  }),

  // Batch Processing
  batch: z
    .object({
      selection_mode: z.enum(['all', 'unfinalized', 'range', 'manual_review']).default('unfinalized'),
      reference_range: z
        .object({
          start: z.number().int().min(1).optional(),
          end: z.number().int().min(1).optional(),
        })
        .optional(),
      max_references: z.number().int().min(1).optional(),
      save_progress: z.boolean().default(true),
      progress_file: z.string().default('./batch-progress.json'),
      create_backup: z.boolean().default(true),
    })
    .optional(),

  // Logging
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      save_logs: z.boolean().default(true),
      log_directory: z.string().default('./logs'),
    })
    .optional(),
});

/**
 * Pipeline configuration type (inferred from schema)
 */
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: Omit<
  PipelineConfig,
  'google_api_key' | 'google_cse_id' | 'anthropic_api_key'
> = {
  search: {
    queries_per_reference: 8,
    primary_queries: 4,
    secondary_queries: 4,
    results_per_query: 10,
  },
  refinement: {
    validate_top_n: 20,
    primary_threshold: 75,
    secondary_threshold: 75,
    enhanced_soft_404: true,
  },
  rate_limiting: {
    google_max_per_day: 100,
    google_max_per_second: 1,
    delay_after_search: 1000,
    delay_after_validation: 200,
    timeout: 10000,
  },
  output: {
    format: 'decisions',
    path: './output/decisions.txt',
    batch_version: 'v2.0',
    auto_finalize: false,
  },
  batch: {
    selection_mode: 'unfinalized',
    save_progress: true,
    progress_file: './batch-progress.json',
    create_backup: true,
  },
  logging: {
    level: 'info',
    save_logs: true,
    log_directory: './logs',
  },
};

/**
 * Load configuration from YAML file
 *
 * @param filepath - Path to YAML config file
 * @returns Validated pipeline configuration
 */
export async function loadConfig(filepath: string): Promise<PipelineConfig> {
  const content = await fs.readFile(filepath, 'utf-8');
  const data = parseYAML(content);

  // Replace environment variables
  const resolved = resolveEnvVars(data);

  // Validate with Zod
  const config = PipelineConfigSchema.parse(resolved);

  return config;
}

/**
 * Load configuration from environment variables
 *
 * @returns Partial pipeline configuration from env vars
 */
export function loadConfigFromEnv(): Partial<PipelineConfig> {
  return {
    google_api_key: process.env.GOOGLE_API_KEY,
    google_cse_id: process.env.GOOGLE_CSE_ID,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
  };
}

/**
 * Resolve environment variable references in config object
 *
 * Replaces ${VAR_NAME} with environment variable values
 */
function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    // Replace ${VAR_NAME} with env var value
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      const value = process.env[varName];
      if (!value) {
        throw new Error(`Environment variable ${varName} is not set`);
      }
      return value;
    });
  } else if (Array.isArray(obj)) {
    return obj.map((item) => resolveEnvVars(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVars(value);
    }
    return result;
  }
  return obj;
}

/**
 * Merge configurations (later configs override earlier ones)
 *
 * @param configs - Array of partial configs to merge
 * @returns Merged configuration
 */
export function mergeConfigs(...configs: Partial<PipelineConfig>[]): Partial<PipelineConfig> {
  const result: Partial<PipelineConfig> = {};

  for (const config of configs) {
    Object.assign(result, config);
    if (config.search) {
      result.search = { ...result.search, ...config.search } as any;
    }
    if (config.refinement) {
      result.refinement = { ...result.refinement, ...config.refinement } as any;
    }
    if (config.rate_limiting) {
      result.rate_limiting = { ...result.rate_limiting, ...config.rate_limiting } as any;
    }
    if (config.output) {
      result.output = { ...result.output, ...config.output } as any;
    }
    if (config.batch) {
      result.batch = { ...result.batch, ...config.batch } as any;
    }
    if (config.logging) {
      result.logging = { ...result.logging, ...config.logging } as any;
    }
  }

  return result;
}

/**
 * Validate configuration
 *
 * @param config - Configuration to validate
 * @returns Validated configuration
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: unknown): PipelineConfig {
  return PipelineConfigSchema.parse(config);
}

/**
 * Create default configuration with API keys
 *
 * @param apiKeys - API keys
 * @returns Complete pipeline configuration
 */
export function createDefaultConfig(apiKeys: {
  google_api_key: string;
  google_cse_id: string;
  anthropic_api_key: string;
}): PipelineConfig {
  return {
    ...DEFAULT_PIPELINE_CONFIG,
    ...apiKeys,
  };
}

/**
 * Save configuration to YAML file
 *
 * @param config - Configuration to save
 * @param filepath - Output file path
 */
export async function saveConfig(config: PipelineConfig, filepath: string): Promise<void> {
  const yaml = require('yaml');
  const content = yaml.stringify(config);
  await fs.writeFile(filepath, content, 'utf-8');
}
