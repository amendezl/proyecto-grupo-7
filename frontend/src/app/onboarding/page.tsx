'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { 
  Building2, Briefcase, GraduationCap, Hospital, 
  ParkingCircle, Dumbbell, Wrench, Calendar,
  ArrowRight, ArrowLeft, Check, Sparkles
} from 'lucide-react';

interface Industry {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  defaultTerminology: {
    resource: { singular: string; plural: string };
    reservation: { singular: string; plural: string };
  };
}

const INDUSTRIES: Industry[] = [
  {
    id: 'healthcare',
    name: 'Salud',
    description: 'Hospitales, clínicas, centros médicos',
    icon: Hospital,
    defaultTerminology: {
      resource: { singular: 'sala', plural: 'salas' },
      reservation: { singular: 'turno', plural: 'turnos' }
    }
  },
  {
    id: 'education',
    name: 'Educación',
    description: 'Colegios, universidades, centros de formación',
    icon: GraduationCap,
    defaultTerminology: {
      resource: { singular: 'aula', plural: 'aulas' },
      reservation: { singular: 'reserva', plural: 'reservas' }
    }
  },
  {
    id: 'office',
    name: 'Oficinas',
    description: 'Espacios de trabajo corporativo',
    icon: Briefcase,
    defaultTerminology: {
      resource: { singular: 'espacio', plural: 'espacios' },
      reservation: { singular: 'reserva', plural: 'reservas' }
    }
  },
  {
    id: 'coworking',
    name: 'Coworking',
    description: 'Espacios de trabajo compartido',
    icon: Building2,
    defaultTerminology: {
      resource: { singular: 'box', plural: 'boxes' },
      reservation: { singular: 'reserva', plural: 'reservas' }
    }
  },
  {
    id: 'parking',
    name: 'Estacionamientos',
    description: 'Gestión de estacionamientos',
    icon: ParkingCircle,
    defaultTerminology: {
      resource: { singular: 'estacionamiento', plural: 'estacionamientos' },
      reservation: { singular: 'reserva', plural: 'reservas' }
    }
  },
  {
    id: 'sports',
    name: 'Deportes',
    description: 'Canchas, gimnasios, instalaciones deportivas',
    icon: Dumbbell,
    defaultTerminology: {
      resource: { singular: 'cancha', plural: 'canchas' },
      reservation: { singular: 'turno', plural: 'turnos' }
    }
  },
  {
    id: 'equipment',
    name: 'Equipamiento',
    description: 'Préstamo de herramientas y equipos',
    icon: Wrench,
    defaultTerminology: {
      resource: { singular: 'herramienta', plural: 'herramientas' },
      reservation: { singular: 'préstamo', plural: 'préstamos' }
    }
  },
  {
    id: 'events',
    name: 'Eventos',
    description: 'Salones de eventos y conferencias',
    icon: Calendar,
    defaultTerminology: {
      resource: { singular: 'espacio', plural: 'espacios' },
      reservation: { singular: 'reserva', plural: 'reservas' }
    }
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Paso 1: Selección de industria
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);

  // Paso 2: Personalización de terminología
  const [terminology, setTerminology] = useState({
    resource: { singular: '', plural: '', article: 'el' },
    reservation: { singular: '', plural: '', article: 'la' },
    zone: { singular: 'zona', plural: 'zonas', article: 'la' },
    user: { singular: 'usuario', plural: 'usuarios', article: 'el' },
    responsible: { singular: 'responsable', plural: 'responsables', article: 'el' }
  });

  useEffect(() => {
    // Verificar si el usuario ya completó el onboarding
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  useEffect(() => {
    // Cuando se selecciona una industria, prellenar la terminología
    if (selectedIndustry) {
      setTerminology(prev => ({
        ...prev,
        resource: {
          singular: selectedIndustry.defaultTerminology.resource.singular,
          plural: selectedIndustry.defaultTerminology.resource.plural,
          article: prev.resource.article
        },
        reservation: {
          singular: selectedIndustry.defaultTerminology.reservation.singular,
          plural: selectedIndustry.defaultTerminology.reservation.plural,
          article: prev.reservation.article
        }
      }));
    }
  }, [selectedIndustry]);

  const handleNext = () => {
    if (step === 1 && !selectedIndustry) {
      setError('Por favor selecciona una industria');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');

    try {
      // Actualizar la configuración de la organización
      const response = await apiClient.put('/api/organizations/my/config', {
        terminology,
        business: {
          industry: selectedIndustry?.id
        }
      });

      if (response.ok) {
        // Redirigir al dashboard
        router.push('/dashboard');
      } else {
        setError(response.error || 'Error al guardar la configuración');
      }
    } catch (err) {
      console.error('Error saving onboarding:', err);
      setError('Error de conexión al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">¡Bienvenido a tu sistema!</h1>
          <p className="text-lg text-gray-600">Personaliza tu experiencia en 2 simples pasos</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Industria</span>
            </div>
            <div className={`w-20 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Terminología</span>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Industry Selection */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Cuál es tu industria?</h2>
              <p className="text-gray-600 mb-8">Esto nos ayudará a configurar el sistema con valores predeterminados optimizados para ti</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {INDUSTRIES.map((industry) => {
                  const Icon = industry.icon;
                  const isSelected = selectedIndustry?.id === industry.id;

                  return (
                    <button
                      key={industry.id}
                      onClick={() => setSelectedIndustry(industry)}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <Icon className={`w-8 h-8 mb-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <h3 className="font-semibold text-gray-900 mb-1">{industry.name}</h3>
                      <p className="text-sm text-gray-600">{industry.description}</p>
                      {isSelected && (
                        <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                          <Check className="w-4 h-4 mr-1" />
                          Seleccionado
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Terminology Customization */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personaliza tu terminología</h2>
              <p className="text-gray-600 mb-8">
                ¿Cómo quieres llamar a tus recursos? Puedes usar los valores sugeridos o personalizarlos
              </p>

              <div className="space-y-6 mb-8">
                {/* Resource */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Recurso principal (ej: espacios, salas, canchas)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Singular</label>
                      <input
                        type="text"
                        value={terminology.resource.singular}
                        onChange={(e) => setTerminology({
                          ...terminology,
                          resource: { ...terminology.resource, singular: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="espacio"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plural</label>
                      <input
                        type="text"
                        value={terminology.resource.plural}
                        onChange={(e) => setTerminology({
                          ...terminology,
                          resource: { ...terminology.resource, plural: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="espacios"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Vista previa:</strong> "Gestiona tus {terminology.resource.plural} | Ver {terminology.resource.singular}"
                    </p>
                  </div>
                </div>

                {/* Reservation */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Reservas/Turnos/Préstamos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Singular</label>
                      <input
                        type="text"
                        value={terminology.reservation.singular}
                        onChange={(e) => setTerminology({
                          ...terminology,
                          reservation: { ...terminology.reservation, singular: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="reserva"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plural</label>
                      <input
                        type="text"
                        value={terminology.reservation.plural}
                        onChange={(e) => setTerminology({
                          ...terminology,
                          reservation: { ...terminology.reservation, plural: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="reservas"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Vista previa:</strong> "Mis {terminology.reservation.plural} | Crear {terminology.reservation.singular}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div>
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
                  disabled={loading}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Atrás
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleSkip}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium"
                disabled={loading}
              >
                Omitir por ahora
              </button>

              {step < 2 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  Siguiente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      Finalizar
                      <Check className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
