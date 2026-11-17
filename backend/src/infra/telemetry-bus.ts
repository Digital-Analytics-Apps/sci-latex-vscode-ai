import { EventEmitter } from 'events';

export interface TrafficTelemetryEvent {
  id: string;
  flowType: 'COMPILATION' | 'AI_CHAT' | 'COLLAB_OT' | 'DATABASE';
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  direction: 'forward' | 'backward';
  description: string;
  durationMs: number;
  particleColor?: string;
  processingNodeIds?: string[];
  timestamp: number;
}

class TelemetryBus extends EventEmitter {
  publishTrafficEvent(event: Omit<TrafficTelemetryEvent, 'id' | 'timestamp'>) {
    const payload: TrafficTelemetryEvent = {
      ...event,
      id: `traffic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    this.emit('traffic', payload);
  }
}

export const telemetryBus = new TelemetryBus();
