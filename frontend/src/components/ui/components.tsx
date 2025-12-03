// Componentes UI - Sistema de Gestión de Espacios
// Biblioteca de componentes reutilizables optimizada

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

// ======== BADGE COMPONENT ========
export interface BadgeProps {
  variant: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado' | 'urgente';
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Badge({ variant, children, size = 'md', className }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full border font-medium';
  
  const variants = {
    disponible: 'bg-green-100 text-green-800 border-green-200',
    ocupado: 'bg-red-100 text-red-800 border-red-200',
    mantenimiento: 'bg-amber-100 text-amber-800 border-amber-200',
    reservado: 'bg-purple-100 text-purple-800 border-purple-200',
    urgente: 'bg-red-200 text-red-900 border-red-300 animate-pulse'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={clsx(baseStyles, variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

// ======== BUTTON COMPONENT ========
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'urgente';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({ 
  variant = 'primary',
  size = 'md', 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
  className,
  type = 'button'
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    urgente: 'bg-red-700 text-white hover:bg-red-800 border-2 border-red-300 animate-pulse focus:ring-red-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        (disabled || loading) && disabledStyles,
        className
      )}
    >
      {loading && <span className="mr-2 animate-spin">⏳</span>}
      {children}
    </button>
  );
}

// ======== METRIC CARD COMPONENT ========
export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  urgent?: boolean;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  color = 'blue',
  urgent = false,
  className 
}: MetricCardProps) {
  const baseStyles = 'bg-white rounded-lg p-6 shadow-sm border transition-all duration-200 hover:shadow-md';
  
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  const urgentStyles = urgent ? 'border-red-300 bg-red-50' : 'border-gray-100';

  return (
    <div className={clsx(baseStyles, urgentStyles, className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={clsx(
            'text-sm font-medium',
            urgent ? 'text-red-700' : 'text-gray-600'
          )}>
            {title}
          </p>
          <p className={clsx(
            'text-3xl font-bold mt-2',
            urgent ? 'text-red-900' : 'text-gray-900'
          )}>
            {value}
          </p>
          {trend && (
            <div className={clsx(
              'flex items-center mt-2 text-sm font-medium',
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              <span className="mr-1">
                {trend.direction === 'up' ? '↗' : '↘'}
              </span>
              <span>{trend.percentage}%</span>
            </div>
          )}
        </div>
        <div className={clsx(
          'p-3 rounded-lg',
          urgent ? 'bg-red-100 text-red-600' : colors[color]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// ======== ALERT COMPONENT ========
export interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error' | 'urgente';
  title: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ type, title, message, onDismiss, className }: AlertProps) {
  const baseStyles = 'border rounded-lg p-4';
  
  const types = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    urgente: 'bg-red-100 border-red-300 text-red-900 animate-pulse'
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    urgente: '🚨'
  };

  return (
    <div className={clsx(baseStyles, types[type], className)}>
      <div className="flex items-start">
        <span className="text-lg mr-3 flex-shrink-0">{icons[type]}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="ml-4 text-lg hover:opacity-70 transition-opacity flex-shrink-0"
            aria-label="Cerrar alerta"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ======== SPACE CARD COMPONENT ========
export interface SpaceCardProps {
  nombre: string;
  zona: string;
  capacidad: number;
  estado: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado';
  proximaReserva?: string;
  usuarioActual?: string;
  onClick?: () => void;
  className?: string;
}

export function SpaceCard({ 
  nombre, 
  zona, 
  capacidad, 
  estado, 
  proximaReserva,
  usuarioActual,
  onClick,
  className
}: SpaceCardProps) {
  const baseStyles = 'bg-white rounded-lg p-4 shadow-sm border border-gray-100 transition-all duration-200 hover:shadow-md';
  const clickableStyles = onClick ? 'cursor-pointer hover:-translate-y-1' : '';

  return (
    <div 
      className={clsx(baseStyles, clickableStyles, className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{nombre}</h3>
          <p className="text-sm text-gray-500 truncate">{zona}</p>
        </div>
        <Badge variant={estado} size="sm">
          {estado.toUpperCase()}
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Capacidad: {capacidad} personas</span>
        </div>
        {usuarioActual && (
          <div className="flex items-center text-blue-600">
            <span className="mr-1">👤</span>
            <span className="truncate">En uso: {usuarioActual}</span>
          </div>
        )}
        {proximaReserva && (
          <div className="flex items-center text-purple-600">
            <span className="mr-1">⏰</span>
            <span>Próxima: {proximaReserva}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ======== INPUT COMPONENT ========
export interface InputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Input({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  error, 
  required = false,
  disabled = false,
  className 
}: InputProps) {
  const baseStyles = 'w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400';
  const errorStyles = error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300';
  const disabledStyles = disabled ? 'bg-gray-50 cursor-not-allowed' : '';

  return (
    <div className={clsx('space-y-1', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={clsx(baseStyles, errorStyles, disabledStyles)}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}