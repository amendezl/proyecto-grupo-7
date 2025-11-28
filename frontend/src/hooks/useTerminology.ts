import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface TerminologyItem {
  singular: string;
  plural: string;
  article: string;
}

interface Terminology {
  resource: TerminologyItem;
  reservation: TerminologyItem;
  zone: TerminologyItem;
  user: TerminologyItem;
  responsible: TerminologyItem;
}

interface UseTerminologyReturn {
  terminology: Terminology;
  loading: boolean;
  error: string | null;
  isDefault: boolean;
  orgId: string | null;
  industry: string | null;
  refresh: () => Promise<void>;
}

// Terminología por defecto (fallback)
const DEFAULT_TERMINOLOGY: Terminology = {
  resource: {
    singular: 'espacio',
    plural: 'espacios',
    article: 'el'
  },
  reservation: {
    singular: 'reserva',
    plural: 'reservas',
    article: 'la'
  },
  zone: {
    singular: 'zona',
    plural: 'zonas',
    article: 'la'
  },
  user: {
    singular: 'usuario',
    plural: 'usuarios',
    article: 'el'
  },
  responsible: {
    singular: 'responsable',
    plural: 'responsables',
    article: 'el'
  }
};

/**
 * Hook para obtener la terminología personalizada de la organización del usuario
 * 
 * @example
 * ```tsx
 * const { terminology, loading } = useTerminology();
 * 
 * return (
 *   <div>
 *     <h1>{terminology.resource.plural}</h1>
 *     <p>Gestiona {terminology.resource.article} {terminology.resource.plural} de tu organización</p>
 *   </div>
 * );
 * ```
 */
export function useTerminology(): UseTerminologyReturn {
  const [terminology, setTerminology] = useState<Terminology>(DEFAULT_TERMINOLOGY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);

  const fetchTerminology = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/organizations/my/terminology');

      if (response.ok && response.data) {
        const data = response.data as any;
        const { terminology: orgTerminology, isDefault: isDefaultTerm, orgId: organizationId, industry: orgIndustry } = data;
        
        setTerminology(orgTerminology || DEFAULT_TERMINOLOGY);
        setIsDefault(isDefaultTerm !== undefined ? isDefaultTerm : true);
        setOrgId(organizationId || null);
        setIndustry(orgIndustry || null);

        // Guardar en localStorage para acceso rápido
        if (orgTerminology) {
          localStorage.setItem('organization_terminology', JSON.stringify(orgTerminology));
        }
      } else {
        // Si falla, intentar cargar desde localStorage
        const cached = localStorage.getItem('organization_terminology');
        if (cached) {
          setTerminology(JSON.parse(cached));
          setIsDefault(false);
        } else {
          setTerminology(DEFAULT_TERMINOLOGY);
          setIsDefault(true);
        }
        setError(response.error || 'No se pudo cargar la terminología');
      }
    } catch (err) {
      console.error('Error loading terminology:', err);
      
      // Intentar cargar desde localStorage como fallback
      const cached = localStorage.getItem('organization_terminology');
      if (cached) {
        try {
          setTerminology(JSON.parse(cached));
          setIsDefault(false);
        } catch {
          setTerminology(DEFAULT_TERMINOLOGY);
          setIsDefault(true);
        }
      } else {
        setTerminology(DEFAULT_TERMINOLOGY);
        setIsDefault(true);
      }
      
      setError('Error de conexión al cargar terminología');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchTerminology();
  }, [fetchTerminology]);

  useEffect(() => {
    fetchTerminology();
  }, [fetchTerminology]);

  return {
    terminology,
    loading,
    error,
    isDefault,
    orgId,
    industry,
    refresh
  };
}

/**
 * Helper para capitalizar primera letra
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Hook simplificado para casos comunes
 * Retorna los términos más usados directamente
 */
export function useCommonTerms() {
  const { terminology, loading } = useTerminology();

  return {
    // Singular
    resource: terminology.resource.singular,
    reservation: terminology.reservation.singular,
    zone: terminology.zone.singular,
    user: terminology.user.singular,
    responsible: terminology.responsible.singular,
    
    // Plural
    resources: terminology.resource.plural,
    reservations: terminology.reservation.plural,
    zones: terminology.zone.plural,
    users: terminology.user.plural,
    responsibles: terminology.responsible.plural,
    
    // Capitalizados singular
    Resource: capitalize(terminology.resource.singular),
    Reservation: capitalize(terminology.reservation.singular),
    Zone: capitalize(terminology.zone.singular),
    User: capitalize(terminology.user.singular),
    Responsible: capitalize(terminology.responsible.singular),
    
    // Capitalizados plural
    Resources: capitalize(terminology.resource.plural),
    Reservations: capitalize(terminology.reservation.plural),
    Zones: capitalize(terminology.zone.plural),
    Users: capitalize(terminology.user.plural),
    Responsibles: capitalize(terminology.responsible.plural),
    
    loading
  };
}
