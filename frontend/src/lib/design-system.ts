// Sistema de Diseño - Sistema de Gestión de Espacios
// Optimizado para gestión empresarial de espacios y reservas

export const designSystem = {
  // 🎨 PALETA DE COLORES
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
    },
    
    // Neutrales empresariales
    neutral: {
      50: '#f8fafc',   // Blanco principal
      100: '#f1f5f9',  // Gris muy claro
      200: '#e2e8f0',  // Bordes sutiles
      400: '#94a3b8',  // Texto secundario
      600: '#475569',  // Texto principal
      800: '#1e293b',  // Encabezados
      900: '#0f172a'   // Texto crítico
    }
  },

  // 📝 TIPOGRAFÍA EMPRESARIAL
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'], // Legibilidad óptima
      mono: ['JetBrains Mono', 'Courier New', 'monospace'] // Códigos y datos
    },
    
    fontSize: {
      xs: '0.75rem',    // Metadatos
      sm: '0.875rem',   // Texto secundario
      base: '1rem',     // Texto principal
      lg: '1.125rem',   // Subtítulos
      xl: '1.25rem',    // Títulos de sección
      '2xl': '1.5rem',  // Títulos principales
      '3xl': '1.875rem' // Encabezados de página
    },
    
    fontWeight: {
      normal: '400',    // Texto regular
      medium: '500',    // Énfasis suave
      semibold: '600',  // Títulos
      bold: '700'       // Elementos importantes
    }
  },

  // 📏 ESPACIADO EMPRESARIAL
  spacing: {
    xs: '0.25rem',    // 4px - espacios mínimos
    sm: '0.5rem',     // 8px - elementos relacionados
    md: '1rem',       // 16px - separación estándar
    lg: '1.5rem',     // 24px - secciones
    xl: '2rem',       // 32px - módulos principales
    '2xl': '3rem',    // 48px - separación mayor
    '3xl': '4rem'     // 64px - separación de página
  },

  // 🔲 BORDES Y SOMBRAS
  borderRadius: {
    sm: '0.375rem',   // Elementos pequeños
    md: '0.5rem',     // Tarjetas estándar
    lg: '0.75rem',    // Modales y containers
    xl: '1rem'        // Elementos destacados
  },

  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',           // Elementos sutiles
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',         // Tarjetas
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',       // Modales
    urgent: '0 0 0 3px rgba(239, 68, 68, 0.2)'     // Estados urgentes
  },

  // ⚡ ESTADOS INTERACTIVOS
  states: {
    hover: {
      scale: '1.02',
      transition: 'all 0.2s ease'
    },
    active: {
      scale: '0.98',
      transition: 'all 0.1s ease'
    },
    disabled: {
      opacity: '0.5',
      cursor: 'not-allowed'
    }
  },

  // 📱 BREAKPOINTS RESPONSIVOS
  breakpoints: {
    sm: '640px',   // Tablets pequeñas
    md: '768px',   // Tablets
    lg: '1024px',  // Laptops
    xl: '1280px',  // Desktops
    '2xl': '1536px' // Pantallas grandes
  },

  // 🚨 ELEMENTOS IMPORTANTES
  important: {
    urgent: {
      background: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600'
    },
    warning: {
      background: 'bg-amber-50',
      border: 'border-amber-200', 
      text: 'text-amber-800',
      icon: 'text-amber-600'
    },
    success: {
      background: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600'
    }
  }
};

// 🎯 TOKENS DE COMPONENTES ESPECÍFICOS
export const componentTokens = {
  card: {
    background: designSystem.colors.neutral[50],
    border: designSystem.colors.neutral[200],
    radius: designSystem.borderRadius.md,
    shadow: designSystem.shadows.md,
    padding: designSystem.spacing.lg
  },
  
  button: {
    primary: {
      background: designSystem.colors.primary[500],
      hover: designSystem.colors.primary[600],
      text: designSystem.colors.neutral[50]
    },
    secondary: {
      background: designSystem.colors.neutral[100],
      hover: designSystem.colors.neutral[200],
      text: designSystem.colors.neutral[800]
    },
    critical: {
      background: designSystem.colors.status.error,
      hover: designSystem.colors.status.urgent,
      text: designSystem.colors.neutral[50]
    }
  },

  dashboard: {
    grid: '12', // Sistema de 12 columnas
    gap: designSystem.spacing.lg,
    cardMinHeight: '200px',
    headerHeight: '64px',
    sidebarWidth: '280px'
  }
};

export default designSystem;