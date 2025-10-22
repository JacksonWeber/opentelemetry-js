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

import { Context, TraceFlags, isSpanContextValid, trace } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';

import { LogRecordProcessor } from '../LogRecordProcessor';
import type { SdkLogRecord } from '../export/SdkLogRecord';
import { LoggerProviderSharedState } from './LoggerProviderSharedState';

/**
 * LogRecordProcessor that applies configuration based filtering before delegating.
 */
export class FilteringLogRecordProcessor implements LogRecordProcessor {
  constructor(
    private readonly _sharedState: LoggerProviderSharedState,
    private readonly _delegate: LogRecordProcessor
  ) {}

  forceFlush(): Promise<void> {
    return this._delegate.forceFlush();
  }

  shutdown(): Promise<void> {
    return this._delegate.shutdown();
  }

  onEmit(logRecord: SdkLogRecord, context?: Context): void {
    const config = this._sharedState.getLoggerConfig(
      logRecord.instrumentationScope
    );

    if (config.disabled) {
      return;
    }

    const severity = logRecord.severityNumber ?? SeverityNumber.UNSPECIFIED;
    if (
      severity !== SeverityNumber.UNSPECIFIED &&
      severity < config.minimumSeverity
    ) {
      return;
    }

    if (config.traceBased) {
      const spanContext =
        logRecord.spanContext ??
        (context ? trace.getSpanContext(context) : undefined);

      if (spanContext && isSpanContextValid(spanContext)) {
        const isSampled =
          (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
        if (!isSampled) {
          return;
        }
      }
    }

    this._delegate.onEmit(logRecord, context);
  }
}
