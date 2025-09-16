/* 
 * CONFIGURACIÓN TIEMPO REAL - WebSocket + DynamoDB Streams
 * Sistema hospital - Notificaciones en tiempo real
 */

import { useEffect, useState } from 'react';

interface RealtimeEvent {
  type: 'reserva_creada' | 'espacio_ocupado' | 'usuario_conectado';
  data: any;
  timestamp: string;
}

class RealtimeClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      console.error('Error: NEXT_PUBLIC_WS_URL no está definido');
      return;
    }
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('🔌 WebSocket conectado');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const data: RealtimeEvent = JSON.parse(event.data);
      this.emit(data.type, data);
    };
    
    this.ws.onclose = () => {
      console.log('❌ WebSocket desconectado');
      this.reconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('🚨 Error WebSocket:', error);
    };
  }
  
  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
  }
  
  subscribe(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }
  
  private emit(eventType: string, data: any) {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(callback => callback(data));
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const realtimeClient = new RealtimeClient();

// Hook para usar tiempo real en componentes
export const useRealtime = (eventType: string, callback: Function) => {
  useEffect(() => {
    realtimeClient.subscribe(eventType, callback);
    
    if (!realtimeClient.isConnected) {
      realtimeClient.connect();
    }
    
    return () => {
      // No desconectar automáticamente, mantener conexión activa
    };
  }, [eventType, callback]);
};

// Configuración DynamoDB Streams para backend
export const REALTIME_CONFIG = {
  // Eventos que disparan notificaciones en tiempo real
  EVENTS: {
    RESERVA_CREADA: 'reserva_creada',
    ESPACIO_OCUPADO: 'espacio_ocupado', 
    USUARIO_CONECTADO: 'usuario_conectado',
    ESTADO_CAMBIADO: 'estado_cambiado'
  },
  
  // Configuración WebSocket
  WEBSOCKET: {
    RECONNECT_INTERVAL: 2000,
    MAX_RECONNECT_ATTEMPTS: 5,
    PING_INTERVAL: 30000
  }
} as const;