// Sistema UI - Gestión de Espacios// Componentes UI - Sistema de Gestión de Espacios// Componentes UI - Sistema de Gestión de Espacios

// Definiciones de tipos y estilos para componentes

// Biblioteca de componentes reutilizables// Biblioteca de componentes reutilizables

export interface BadgeProps {

  variant: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado' | 'urgente';

  children: React.ReactNode;

  size?: 'sm' | 'md' | 'lg';export interface BadgeProps {import { ReactNode } from 'react';

}

  variant: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado' | 'urgente';import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {

  title: string;  children: React.ReactNode;

  value: string | number;

  trend?: {  size?: 'sm' | 'md' | 'lg';// Badge para estados de espacios

    direction: 'up' | 'down';

    percentage: number;}export interface BadgeProps {

  };

  icon: any;  variant: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado' | 'urgente';

  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';

}export interface MetricCardProps {  children: ReactNode;



export interface AlertProps {  title: string;  size?: 'sm' | 'md' | 'lg';

  type: 'info' | 'success' | 'warning' | 'error' | 'urgente';

  title: string;  value: string | number;}

  message: string;

  onDismiss?: () => void;  trend?: {

}

    direction: 'up' | 'down';export function Badge({ variant, children, size = 'md' }: BadgeProps) {

export interface SpaceCardProps {

  nombre: string;    percentage: number;  const variants = {

  zona: string;

  capacidad: number;  };    disponible: 'bg-green-100 text-green-800 border-green-200',

  estado: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado';

  proximaReserva?: string;  icon: any;    ocupado: 'bg-red-100 text-red-800 border-red-200',

  onClick?: () => void;

}  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';    mantenimiento: 'bg-amber-100 text-amber-800 border-amber-200',



// Estilos predefinidos}    reservado: 'bg-purple-100 text-purple-800 border-purple-200',

export const componentStyles = {

  badge: {    urgente: 'bg-red-200 text-red-900 border-red-300'

    disponible: 'bg-green-100 text-green-800 border-green-200',

    ocupado: 'bg-red-100 text-red-800 border-red-200', export interface AlertProps {  };

    mantenimiento: 'bg-amber-100 text-amber-800 border-amber-200',

    reservado: 'bg-purple-100 text-purple-800 border-purple-200',  type: 'info' | 'success' | 'warning' | 'error' | 'urgente';

    urgente: 'bg-red-200 text-red-900 border-red-300'

  },  title: string;  const sizes = {

  

  button: {  message: string;    sm: 'px-2 py-1 text-xs',

    primary: 'bg-blue-600 text-white hover:bg-blue-700',

    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',  onDismiss?: () => void;    md: 'px-3 py-1.5 text-sm',

    success: 'bg-green-600 text-white hover:bg-green-700',

    danger: 'bg-red-600 text-white hover:bg-red-700',}    lg: 'px-4 py-2 text-base'

    urgente: 'bg-red-700 text-white hover:bg-red-800'

  },  };

  

  alert: {export interface ButtonProps {

    info: 'bg-blue-50 border-blue-200 text-blue-800',

    success: 'bg-green-50 border-green-200 text-green-800',  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'urgente';  return (

    warning: 'bg-amber-50 border-amber-200 text-amber-800', 

    error: 'bg-red-50 border-red-200 text-red-800',  size?: 'sm' | 'md' | 'lg';    <span className={`

    urgente: 'bg-red-100 border-red-300 text-red-900'

  }  children: React.ReactNode;      inline-flex items-center rounded-full border font-medium

};

  onClick?: () => void;      ${variants[variant]} ${sizes[size]}

// Iconos por estado

export const statusIcons = {  disabled?: boolean;    `}>

  disponible: '✅',

  ocupado: '🔴',   loading?: boolean;      {children}

  mantenimiento: '🔧',

  reservado: '📅',}    </span>

  urgente: '🚨'

};  );

export interface SpaceCardProps {}

  nombre: string;

  zona: string;// Tarjeta de métrica para dashboard

  capacidad: number;export interface MetricCardProps {

  estado: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado';  title: string;

  proximaReserva?: string;  value: string | number;

  onClick?: () => void;  trend?: {

}    direction: 'up' | 'down';

    percentage: number;

export interface InputProps {  };

  label: string;  icon: LucideIcon;

  type?: string;  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';

  placeholder?: string;}

  value?: string;

  onChange?: (value: string) => void;export function MetricCard({ title, value, trend, icon: Icon, color = 'blue' }: MetricCardProps) {

  error?: string;  const colors = {

  required?: boolean;    blue: 'bg-blue-50 text-blue-600',

}    green: 'bg-green-50 text-green-600',

    red: 'bg-red-50 text-red-600',

// Estilos predefinidos para componentes    amber: 'bg-amber-50 text-amber-600',

export const uiStyles = {    purple: 'bg-purple-50 text-purple-600'

  badges: {  };

    disponible: 'bg-green-100 text-green-800 border-green-200',

    ocupado: 'bg-red-100 text-red-800 border-red-200',  return (

    mantenimiento: 'bg-amber-100 text-amber-800 border-amber-200',    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">

    reservado: 'bg-purple-100 text-purple-800 border-purple-200',      <div className="flex items-center justify-between">

    urgente: 'bg-red-200 text-red-900 border-red-300'        <div>

  },          <p className="text-sm font-medium text-gray-600">{title}</p>

            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>

  buttons: {          {trend && (

    primary: 'bg-blue-600 text-white hover:bg-blue-700',            <div className={`flex items-center mt-2 text-sm ${

    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'

    success: 'bg-green-600 text-white hover:bg-green-700',            }`}>

    danger: 'bg-red-600 text-white hover:bg-red-700',              <span>{trend.direction === 'up' ? '↗' : '↘'}</span>

    urgente: 'bg-red-700 text-white hover:bg-red-800 border-2 border-red-300'              <span className="ml-1">{trend.percentage}%</span>

  },            </div>

            )}

  alerts: {        </div>

    info: 'bg-blue-50 border-blue-200 text-blue-800',        <div className={`p-3 rounded-lg ${colors[color]}`}>

    success: 'bg-green-50 border-green-200 text-green-800',          <Icon className="h-6 w-6" />

    warning: 'bg-amber-50 border-amber-200 text-amber-800',        </div>

    error: 'bg-red-50 border-red-200 text-red-800',      </div>

    urgente: 'bg-red-100 border-red-300 text-red-900'    </div>

  },  );

  }

  metricCards: {

    blue: 'bg-blue-50 text-blue-600',// Alert para notificaciones del sistema

    green: 'bg-green-50 text-green-600',export interface AlertProps {

    red: 'bg-red-50 text-red-600',  type: 'info' | 'success' | 'warning' | 'error' | 'urgente';

    amber: 'bg-amber-50 text-amber-600',  title: string;

    purple: 'bg-purple-50 text-purple-600'  message: string;

  }  onDismiss?: () => void;

};}



// Configuración de iconos para cada estadoexport function Alert({ type, title, message, onDismiss }: AlertProps) {

export const statusIcons = {  const types = {

  disponible: '✅',    info: 'bg-blue-50 border-blue-200 text-blue-800',

  ocupado: '🔴',    success: 'bg-green-50 border-green-200 text-green-800',

  mantenimiento: '🔧',    warning: 'bg-amber-50 border-amber-200 text-amber-800',

  reservado: '📅',    error: 'bg-red-50 border-red-200 text-red-800',

  urgente: '🚨'    urgente: 'bg-red-100 border-red-300 text-red-900'

};  };



// Configuración de colores del sistema  const icons = {

export const systemColors = {    info: 'ℹ️',

  primary: '#0ea5e9',    success: '✅',

  success: '#10b981',    warning: '⚠️',

  warning: '#f59e0b',    error: '❌',

  error: '#ef4444',    urgente: '🚨'

  urgent: '#dc2626',  };

  info: '#3b82f6'

};  return (
    <div className={`border rounded-lg p-4 ${types[type]}`}>
      <div className="flex items-start">
        <span className="text-lg mr-3">{icons[type]}</span>
        <div className="flex-1">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm mt-1">{message}</p>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="ml-4 text-lg hover:opacity-70"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// Botón principal del sistema
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'urgente';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ 
  variant, 
  size = 'md', 
  children, 
  onClick, 
  disabled = false, 
  loading = false 
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    success: 'bg-green-600 text-white hover:bg-green-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    urgente: 'bg-red-700 text-white hover:bg-red-800 border-2 border-red-300'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-lg font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
        ${variants[variant]} ${sizes[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading && <span className="mr-2">⏳</span>}
      {children}
    </button>
  );
}

// Card para espacios
export interface SpaceCardProps {
  nombre: string;
  zona: string;
  capacidad: number;
  estado: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado';
  proximaReserva?: string;
  onClick?: () => void;
}

export function SpaceCard({ 
  nombre, 
  zona, 
  capacidad, 
  estado, 
  proximaReserva, 
  onClick 
}: SpaceCardProps) {
  return (
    <div 
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{nombre}</h3>
          <p className="text-sm text-gray-500">{zona}</p>
        </div>
        <Badge variant={estado} size="sm">
          {estado.toUpperCase()}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Capacidad: {capacidad} personas</span>
        {proximaReserva && (
          <span>Próx: {proximaReserva}</span>
        )}
      </div>
    </div>
  );
}

// Input mejorado
export interface InputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function Input({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  error, 
  required = false 
}: InputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`
          w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
          ${error ? 'border-red-300' : 'border-gray-300'}
        `}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}