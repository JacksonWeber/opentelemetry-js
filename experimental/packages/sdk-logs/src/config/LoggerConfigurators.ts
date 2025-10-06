/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { InstrumentationScope } from '@opentelemetry/core';
import { SeverityNumber } from '@opentelemetry/api-logs';
import type { LoggerConfig, LoggerConfigurator } from '../types';

/**
 * Default LoggerConfig used when no pattern matches
 */
const DEFAULT_LOGGER_CONFIG: Required<LoggerConfig> = {
  disabled: false,
  minimumSeverity: SeverityNumber.UNSPECIFIED,
  traceBased: false,
};

/**
 * Configuration for a specific logger pattern
 */
export interface LoggerPattern {
  /**
   * The logger name or pattern to match.
   * Use '*' for wildcard matching.
   */
  pattern: string;

  /**
   * The configuration to apply to matching loggers.
   * Partial config is allowed; unspecified properties will use defaults.
   */
  config: LoggerConfig;
}

/**
 * Creates a LoggerConfigurator from an array of logger patterns.
 * Patterns are evaluated in order, and the first matching pattern's config is used.
 * Supports exact matching and simple wildcard patterns with '*'.
 *
 * The returned configurator computes a complete LoggerConfig by merging the matched
 * pattern's config with default values for any unspecified properties.
 *
 * @param patterns - Array of logger patterns with their configurations
 * @returns A LoggerConfigurator function that computes complete LoggerConfig
 *
 * @example
 * ```typescript
 * const configurator = createLoggerConfigurator([
 *   { pattern: 'debug-logger', config: { minimumSeverity: SeverityNumber.DEBUG } },
 *   { pattern: 'prod-*', config: { minimumSeverity: SeverityNumber.WARN } },
 *   { pattern: '*', config: { minimumSeverity: SeverityNumber.INFO } },
 * ]);
 * ```
 */
export function createLoggerConfigurator(
  patterns: LoggerPattern[]
): LoggerConfigurator {
  return (loggerScope: InstrumentationScope): Required<LoggerConfig> => {
    const loggerName = loggerScope.name;

    // Find the first matching pattern
    for (const { pattern, config } of patterns) {
      if (matchesPattern(loggerName, pattern)) {
        // Compute complete config by merging with defaults
        return {
          disabled: config.disabled ?? DEFAULT_LOGGER_CONFIG.disabled,
          minimumSeverity:
            config.minimumSeverity ?? DEFAULT_LOGGER_CONFIG.minimumSeverity,
          traceBased: config.traceBased ?? DEFAULT_LOGGER_CONFIG.traceBased,
        };
      }
    }

    // No pattern matched, return default config
    return { ...DEFAULT_LOGGER_CONFIG };
  };
}

/**
 * Matches a logger name against a pattern.
 * Supports simple wildcard matching with '*'.
 *
 * @param name - The logger name to match
 * @param pattern - The pattern to match against (supports '*' wildcard)
 * @returns true if the name matches the pattern
 */
function matchesPattern(name: string, pattern: string): boolean {
  // Exact match
  if (pattern === name) {
    return true;
  }

  // Wildcard pattern
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .split('*')
      .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(name);
  }

  return false;
}
