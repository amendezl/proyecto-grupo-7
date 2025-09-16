'use client';

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/components';

interface CancelReservaButtonProps {
  reservaId: string;
  reservaNombre: string;
  onCancel: (reservaId: string) => Promise<void>;
  disabled?: boolean;
}

export default function CancelReservaButton({
  reservaId,
  reservaNombre,
  onCancel,
  disabled = false
}: CancelReservaButtonProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await onCancel(reservaId);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Error cancelando reserva:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setShowConfirmModal(true)}
        disabled={disabled}
      >
        <X className="h-4 w-4 mr-1" />
        Cancelar
      </Button>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Cancelar Reserva
                </h3>
                <p className="text-sm text-gray-600">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                ¿Estás seguro de que deseas cancelar la reserva:{' '}
                <span className="font-medium">{reservaNombre}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                La reserva quedará marcada como cancelada y el espacio estará disponible para otras reservas.
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isLoading}
              >
                No, mantener reserva
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {isLoading ? 'Cancelando...' : 'Sí, cancelar reserva'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}