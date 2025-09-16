'use client';

import React, { useState } from 'react';
import { Power } from 'lucide-react';

interface ToggleEstadoButtonProps {
  id: string;
  currentEstado: 'activo' | 'inactivo' | 'disponible' | 'ocupado' | 'mantenimiento';
  entityType: 'usuario' | 'responsable' | 'zona' | 'espacio';
  entityName: string;
  onToggle: (id: string) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ToggleEstadoButton({
  id,
  currentEstado,
  entityType,
  entityName,
  onToggle,
  disabled = false,
  size = 'sm'
}: ToggleEstadoButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle(id);
    } catch (error) {
      console.error(`Error toggling ${entityType} estado:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonConfig = () => {
    const isActive = currentEstado === 'activo' || currentEstado === 'disponible';
    
    return {
      color: isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700',
      text: isActive ? 'Desactivar' : 'Activar',
      icon: Power
    };
  };

  const config = getButtonConfig();
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={`
        ${config.color}
        ${sizeClasses[size]}
        text-white rounded-lg font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center space-x-1
      `}
      title={`${config.text} ${entityType}: ${entityName}`}
    >
      <config.icon className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />
      <span>{isLoading ? 'Cambiando...' : config.text}</span>
    </button>
  );
}