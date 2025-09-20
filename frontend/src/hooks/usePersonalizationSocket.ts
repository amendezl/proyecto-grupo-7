import { useEffect, useRef } from 'react';
import { apiClient } from '../lib/api-client';

type Callbacks = {
  onUpdate?: (payload: any) => void;
};

export default function usePersonalizationSocket(callbacks: Callbacks) {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    apiClient.connectWebSocket({
      onMessage: (data) => {
        if (data?.type === 'personalization.update') {
          callbacks.onUpdate?.(data.payload);
        }
      },
      onError: (err) => {
        console.error('WebSocket error:', err);
      },
      onClose: () => {
        console.log('WebSocket closed');
      }
    });

    return () => {
      apiClient.disconnectWebSocket();
    };
  }, []);
}
