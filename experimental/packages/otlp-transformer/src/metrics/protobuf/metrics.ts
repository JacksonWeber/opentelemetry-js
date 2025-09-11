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

import * as root from '../../generated/root';
import { ISerializer } from '../../i-serializer';
import { IExportMetricsServiceRequest } from '../internal-types';
import { ExportType } from '../../common/protobuf/protobuf-export-type';
import { createExportMetricsServiceRequest } from '../internal';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { IExportMetricsServiceResponse } from '../export-response';

const metricsResponseType = root.opentelemetry.proto.collector.metrics.v1
  .ExportMetricsServiceResponse as ExportType<IExportMetricsServiceResponse>;

const metricsRequestType = root.opentelemetry.proto.collector.metrics.v1
  .ExportMetricsServiceRequest as ExportType<IExportMetricsServiceRequest>;

export const ProtobufMetricsSerializer: ISerializer<
  ResourceMetrics,
  IExportMetricsServiceResponse
> = {
  serializeRequest: (arg: ResourceMetrics) => {
    console.log('[OpenTelemetry OTLP-Transformer Protobuf] ===== SERIALIZING METRICS REQUEST =====');
    
    const request = createExportMetricsServiceRequest([arg]);
    
    console.log('[OpenTelemetry OTLP-Transformer Protobuf] OTLP Request Structure:');
    console.log(JSON.stringify(request, (key, value) => {
      // Handle BigInt conversion for display
      if (typeof value === 'bigint') {
        return value.toString() + 'n';
      }
      // Handle Uint8Array conversion for display  
      if (value instanceof Uint8Array) {
        return `Uint8Array[${value.length}]`;
      }
      return value;
    }, 2));
    
    const encoded = metricsRequestType.encode(request).finish();
    console.log(`[OpenTelemetry OTLP-Transformer Protobuf] Encoded protobuf size: ${encoded.length} bytes`);
    
    return encoded;
  },
  deserializeResponse: (arg: Uint8Array) => {
    console.log(`[OpenTelemetry OTLP-Transformer Protobuf] ===== DESERIALIZING METRICS RESPONSE =====`);
    console.log(`[OpenTelemetry OTLP-Transformer Protobuf] Response size: ${arg.length} bytes`);
    
    const response = metricsResponseType.decode(arg);
    
    console.log('[OpenTelemetry OTLP-Transformer Protobuf] Decoded response:');
    console.log(JSON.stringify(response, null, 2));
    
    return response;
  },
};
