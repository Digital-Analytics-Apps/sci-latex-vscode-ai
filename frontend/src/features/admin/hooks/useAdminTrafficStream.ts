import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getRuntimeEnv } from '../../../constants/api.constants';
import type { RootState } from '../../../store';
import type { TraceStep } from '../components/topology/types';

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

export function useAdminTrafficStream(
  onTrafficEvent?: (step: TraceStep) => void
) {
  const token = useSelector((state: RootState) => state.auth.token);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastLiveEvent, setLastLiveEvent] = useState<TrafficTelemetryEvent | null>(null);
  const callbackRef = useRef(onTrafficEvent);

  useEffect(() => {
    callbackRef.current = onTrafficEvent;
  }, [onTrafficEvent]);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const baseUrl = getRuntimeEnv('VITE_API_URL');
    const streamUrl = `${baseUrl}/admin/dashboard/events`;

    async function connectTrafficStream() {
      try {
        const response = await fetch(streamUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setIsConnected(false);
          return;
        }

        setIsConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            if (!block.trim()) continue;

            let eventType = '';
            let dataStr = '';

            for (const line of block.split('\n')) {
              if (line.startsWith('event: ')) {
                eventType = line.replace('event: ', '').trim();
              } else if (line.startsWith('data: ')) {
                dataStr = line.replace('data: ', '').trim();
              }
            }

            if (eventType === 'TRAFFIC_EVENT' && dataStr) {
              try {
                const event = JSON.parse(dataStr) as TrafficTelemetryEvent;
                setLastLiveEvent(event);

                const traceStep: TraceStep = {
                  edgeId: event.edgeId,
                  sourceNodeId: event.sourceNodeId,
                  targetNodeId: event.targetNodeId,
                  direction: event.direction,
                  description: event.description,
                  durationMs: event.durationMs || 1400,
                  particleColor: event.particleColor || '#38bdf8',
                  processingNodeIds: event.processingNodeIds,
                };

                if (callbackRef.current) {
                  callbackRef.current(traceStep);
                }
              } catch {
                // Ignora JSON malformado
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setIsConnected(false);
        }
      }
    }

    connectTrafficStream();

    return () => {
      controller.abort();
      setIsConnected(false);
    };
  }, [token]);

  return { isConnected, lastLiveEvent };
}
