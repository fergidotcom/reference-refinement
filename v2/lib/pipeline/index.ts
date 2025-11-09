/**
 * Reference Refinement v2 - Pipeline Integration
 *
 * Complete pipeline for processing references:
 * - Single reference processing
 * - Batch processing with progress tracking
 * - Configuration management
 */

export { ReferencePipeline, type PipelineResult } from './reference-pipeline.js';
export { BatchProcessor, type BatchOptions, type BatchResult } from './batch-processor.js';
export { ProgressTracker, formatElapsedTime } from './progress-tracker.js';
export {
  type PipelineConfig,
  PipelineConfigSchema,
  DEFAULT_PIPELINE_CONFIG,
  loadConfig,
  loadConfigFromEnv,
  mergeConfigs,
  validateConfig,
  createDefaultConfig,
  saveConfig,
} from './pipeline-config.js';
