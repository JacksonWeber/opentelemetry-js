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

import { getStringFromEnv } from '@opentelemetry/core';
import {
  AggregationTemporality,
  AggregationTemporalitySelector,
  InstrumentType,
  PushMetricExporter,
  ResourceMetrics,
  AggregationSelector,
  AggregationOption,
  AggregationType,
} from '@opentelemetry/sdk-metrics';
import {
  AggregationTemporalityPreference,
  OTLPMetricExporterOptions,
} from './OTLPMetricExporterOptions';
import {
  IOtlpExportDelegate,
  OTLPExporterBase,
} from '@opentelemetry/otlp-exporter-base';
import { diag } from '@opentelemetry/api';

export const CumulativeTemporalitySelector: AggregationTemporalitySelector =
  () => AggregationTemporality.CUMULATIVE;

export const DeltaTemporalitySelector: AggregationTemporalitySelector = (
  instrumentType: InstrumentType
) => {
  switch (instrumentType) {
    case InstrumentType.COUNTER:
    case InstrumentType.OBSERVABLE_COUNTER:
    case InstrumentType.GAUGE:
    case InstrumentType.HISTOGRAM:
    case InstrumentType.OBSERVABLE_GAUGE:
      return AggregationTemporality.DELTA;
    case InstrumentType.UP_DOWN_COUNTER:
    case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
      return AggregationTemporality.CUMULATIVE;
  }
};

export const LowMemoryTemporalitySelector: AggregationTemporalitySelector = (
  instrumentType: InstrumentType
) => {
  switch (instrumentType) {
    case InstrumentType.COUNTER:
    case InstrumentType.HISTOGRAM:
      return AggregationTemporality.DELTA;
    case InstrumentType.GAUGE:
    case InstrumentType.UP_DOWN_COUNTER:
    case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
    case InstrumentType.OBSERVABLE_COUNTER:
    case InstrumentType.OBSERVABLE_GAUGE:
      return AggregationTemporality.CUMULATIVE;
  }
};

function chooseTemporalitySelectorFromEnvironment() {
  const configuredTemporality = (
    getStringFromEnv('OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE') ??
    'cumulative'
  ).toLowerCase();

  if (configuredTemporality === 'cumulative') {
    return CumulativeTemporalitySelector;
  }
  if (configuredTemporality === 'delta') {
    return DeltaTemporalitySelector;
  }
  if (configuredTemporality === 'lowmemory') {
    return LowMemoryTemporalitySelector;
  }

  diag.warn(
    `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE is set to '${configuredTemporality}', but only 'cumulative' and 'delta' are allowed. Using default ('cumulative') instead.`
  );
  return CumulativeTemporalitySelector;
}

function chooseTemporalitySelector(
  temporalityPreference?:
    | AggregationTemporalityPreference
    | AggregationTemporality
): AggregationTemporalitySelector {
  // Directly passed preference has priority.
  if (temporalityPreference != null) {
    if (temporalityPreference === AggregationTemporalityPreference.DELTA) {
      return DeltaTemporalitySelector;
    } else if (
      temporalityPreference === AggregationTemporalityPreference.LOWMEMORY
    ) {
      return LowMemoryTemporalitySelector;
    }
    return CumulativeTemporalitySelector;
  }

  return chooseTemporalitySelectorFromEnvironment();
}

const DEFAULT_AGGREGATION = Object.freeze({
  type: AggregationType.DEFAULT,
});

function chooseAggregationSelector(
  config: OTLPMetricExporterOptions | undefined
): AggregationSelector {
  return config?.aggregationPreference ?? (() => DEFAULT_AGGREGATION);
}

export class OTLPMetricExporterBase
  extends OTLPExporterBase<ResourceMetrics>
  implements PushMetricExporter
{
  private readonly _aggregationTemporalitySelector: AggregationTemporalitySelector;
  private readonly _aggregationSelector: AggregationSelector;

  constructor(
    delegate: IOtlpExportDelegate<ResourceMetrics>,
    config?: OTLPMetricExporterOptions
  ) {
    super(delegate);
    this._aggregationSelector = chooseAggregationSelector(config);
    this._aggregationTemporalitySelector = chooseTemporalitySelector(
      config?.temporalityPreference
    );
    
    console.log('[OpenTelemetry OTLP-Metrics-Exporter-Base] Base exporter configured:');
    console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]   Temporality preference: ${config?.temporalityPreference || 'from environment'}`);
    console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]   Aggregation preference: ${config?.aggregationPreference ? 'custom' : 'default'}`);
  }

  override export(
    metrics: ResourceMetrics,
    resultCallback: (result: import('@opentelemetry/core').ExportResult) => void
  ): void {
    console.log('[OpenTelemetry OTLP-Metrics-Exporter-Base] ===== EXPORTING METRICS =====');
    console.log('[OpenTelemetry OTLP-Metrics-Exporter-Base] Resource attributes:');
    console.log(JSON.stringify(metrics.resource.attributes, null, 2));
    
    console.log('[OpenTelemetry OTLP-Metrics-Exporter-Base] Scope metrics count:', metrics.scopeMetrics.length);
    
    metrics.scopeMetrics.forEach((scopeMetric, scopeIndex) => {
      console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base] Scope ${scopeIndex}: ${scopeMetric.scope.name}@${scopeMetric.scope.version || 'unknown'}`);
      console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]   Metrics count: ${scopeMetric.metrics.length}`);
      
      scopeMetric.metrics.forEach((metric, metricIndex) => {
        console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]   Metric ${metricIndex}: ${metric.descriptor.name}`);
        console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]     Description: ${metric.descriptor.description || 'none'}`);
        console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]     Unit: ${metric.descriptor.unit || 'none'}`);
        console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]     Data points: ${metric.dataPoints.length}`);
        
        metric.dataPoints.forEach((dataPoint, dpIndex) => {
          console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]       DataPoint ${dpIndex}:`);
          console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]         Value: ${JSON.stringify(dataPoint.value)}`);
          console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]         Attributes: ${JSON.stringify(dataPoint.attributes)}`);
          console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]         Start time: ${new Date(Number(dataPoint.startTime) / 1000000).toISOString()}`);
          console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base]         End time: ${new Date(Number(dataPoint.endTime) / 1000000).toISOString()}`);
        });
      });
    });
    
    console.log('[OpenTelemetry OTLP-Metrics-Exporter-Base] ===== CALLING SUPER.EXPORT =====');
    super.export(metrics, (result) => {
      console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base] Export result: ${result.code}`);
      if (result.error) {
        console.log(`[OpenTelemetry OTLP-Metrics-Exporter-Base] Export error:`, result.error);
      }
      resultCallback(result);
    });
  }

  selectAggregation(instrumentType: InstrumentType): AggregationOption {
    return this._aggregationSelector(instrumentType);
  }

  selectAggregationTemporality(
    instrumentType: InstrumentType
  ): AggregationTemporality {
    return this._aggregationTemporalitySelector(instrumentType);
  }
}
