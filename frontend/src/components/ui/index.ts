// Componentes UI
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface BadgeProps {
  variant: 'disponible' | 'ocupado' | 'mantenimiento' | 'reservado' | 'urgente';
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}
