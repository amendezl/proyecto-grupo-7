import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colores del Sistema de Gestión de Espacios
      colors: {
        // Colores principales - Profesional y moderno
        primary: {
          50: '#f0f9ff',   // Azul muy claro - backgrounds sutiles
          100: '#e0f2fe',  // Azul claro - hover states
          500: '#0ea5e9',  // Azul principal - acciones primarias
          600: '#0284c7',  // Azul medio - estados activos
          900: '#0c4a6e'   // Azul oscuro - textos importantes
        },
        
        // Estados de espacios y reservas
        status: {
          success: '#10b981',   // Verde - operaciones exitosas
          warning: '#f59e0b',   // Ámbar - alertas importantes
          error: '#ef4444',     // Rojo - errores críticos
          info: '#3b82f6',      // Azul - información general
          urgent: '#dc2626'     // Rojo intenso - urgente
        },
        
        // Disponibilidad de espacios
        availability: {
          available: '#22c55e',    // Verde - espacio disponible
          occupied: '#ef4444',     // Rojo - espacio ocupado
          maintenance: '#f59e0b',  // Ámbar - en mantenimiento
          reserved: '#8b5cf6'      // Morado - reservado
        }
      },
      
      // Tipografía empresarial
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace']
      },
      
      // Espaciado empresarial
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '280': '70rem',   // Sidebar width
      },
      
      // Bordes y sombras
      borderRadius: {
        '4xl': '2rem',
      },
      
      boxShadow: {
        'urgent': '0 0 0 3px rgba(239, 68, 68, 0.2)',
        'space': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      
      // Animaciones
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      
      // Breakpoints personalizados
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config