// Página de prueba para componentes UI
'use client';

import React, { useState } from 'react';
import { MapPin, Users, Calendar, Settings, AlertTriangle } from 'lucide-react';
import { 
  Badge, 
  Button, 
  MetricCard, 
  Alert, 
  SpaceCard, 
  Input 
} from '@/components/ui/components';

export default function ComponentsTestPage() {
  const [showAlert, setShowAlert] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleButtonClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Componentes UI - Sistema de Espacios
          </h1>
          <p className="text-lg text-gray-600">
            Prueba y visualización de todos los componentes base
          </p>
        </div>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Badges de Estado</h2>
          <div className="flex flex-wrap gap-4">
            <Badge variant="disponible">Disponible</Badge>
            <Badge variant="ocupado">Ocupado</Badge>
            <Badge variant="mantenimiento">Mantenimiento</Badge>
            <Badge variant="reservado">Reservado</Badge>
            <Badge variant="urgente">Urgente</Badge>
          </div>
          <div className="flex flex-wrap gap-4">
            <Badge variant="disponible" size="sm">Pequeño</Badge>
            <Badge variant="ocupado" size="md">Mediano</Badge>
            <Badge variant="reservado" size="lg">Grande</Badge>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Botones</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" onClick={handleButtonClick} loading={loading}>
              Botón Primario
            </Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="success">Éxito</Button>
            <Button variant="danger">Peligro</Button>
            <Button variant="urgente">Urgente</Button>
            <Button variant="primary" disabled>Deshabilitado</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="sm">Pequeño</Button>
            <Button variant="primary" size="md">Mediano</Button>
            <Button variant="primary" size="lg">Grande</Button>
          </div>
        </section>

        {/* Metric Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Tarjetas de Métricas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Espacios Disponibles"
              value={24}
              icon={MapPin}
              color="green"
              trend={{ direction: 'up', percentage: 12 }}
            />
            <MetricCard
              title="Usuarios Activos"
              value={156}
              icon={Users}
              color="blue"
              trend={{ direction: 'down', percentage: 5 }}
            />
            <MetricCard
              title="Reservas Hoy"
              value={89}
              icon={Calendar}
              color="purple"
            />
            <MetricCard
              title="Sistema Crítico"
              value="ALERTA"
              icon={AlertTriangle}
              color="red"
              urgent={true}
            />
          </div>
        </section>

        {/* Alerts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Alertas</h2>
          <div className="space-y-4">
            <Alert
              type="info"
              title="Información"
              message="El sistema está funcionando correctamente."
            />
            <Alert
              type="success"
              title="Operación Exitosa"
              message="La reserva se ha creado correctamente."
            />
            <Alert
              type="warning"
              title="Advertencia"
              message="El espacio requiere mantenimiento pronto."
            />
            <Alert
              type="error"
              title="Error"
              message="No se pudo procesar la solicitud."
            />
            {showAlert && (
              <Alert
                type="urgente"
                title="Situación Urgente"
                message="Se requiere atención inmediata en la Sala A."
                onDismiss={() => setShowAlert(false)}
              />
            )}
          </div>
        </section>

        {/* Space Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Tarjetas de Espacios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SpaceCard
              nombre="Sala de Reuniones A"
              zona="Piso 1 - Norte"
              capacidad={8}
              estado="ocupado"
              usuarioActual="Juan Pérez"
              proximaReserva="14:30"
              onClick={() => alert('Clicked Sala A')}
            />
            <SpaceCard
              nombre="Oficina 201"
              zona="Piso 2"
              capacidad={4}
              estado="disponible"
              onClick={() => alert('Clicked Oficina 201')}
            />
            <SpaceCard
              nombre="Lab. Computación"
              zona="Piso 3"
              capacidad={20}
              estado="mantenimiento"
            />
            <SpaceCard
              nombre="Aula Magna"
              zona="Planta Baja"
              capacidad={50}
              estado="reservado"
              proximaReserva="15:00"
            />
          </div>
        </section>

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Campos de Entrada</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <Input
              label="Nombre del Espacio"
              placeholder="Ingresa el nombre..."
              value={inputValue}
              onChange={setInputValue}
              required
            />
            <Input
              label="Capacidad"
              type="number"
              placeholder="Número de personas"
            />
            <Input
              label="Email"
              type="email"
              placeholder="correo@ejemplo.com"
              error="El formato del email no es válido"
            />
            <Input
              label="Campo Deshabilitado"
              placeholder="No editable"
              disabled
            />
          </div>
        </section>

        {/* Integration Example */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Ejemplo de Integración</h2>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Panel de Control</h3>
                <Badge variant="disponible">Activo</Badge>
              </div>
              <Button variant="primary">
                Configurar
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MetricCard
                title="Estado"
                value="Operativo"
                icon={Settings}
                color="green"
              />
              <MetricCard
                title="Conexiones"
                value={42}
                icon={Users}
                color="blue"
              />
              <MetricCard
                title="Latencia"
                value="12ms"
                icon={AlertTriangle}
                color="amber"
              />
            </div>

            <Alert
              type="success"
              title="Sistema Configurado"
              message="Todos los componentes están funcionando correctamente."
            />
          </div>
        </section>

      </div>
    </div>
  );
}