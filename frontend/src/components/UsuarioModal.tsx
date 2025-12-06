'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Save, User, Shield, Building2, Lock } from 'lucide-react';
import { Button, Input } from '@/components/ui/components';
import { Usuario } from '@/lib/api-client';

interface UsuarioModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  usuario?: Usuario | null;
  departamentos?: string[];
  onClose: () => void;
  onSubmit: (payload: Partial<Usuario> & { password?: string }) => Promise<void>;
}

const DEFAULT_FORM = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  departamento: '',
  rol: 'usuario' as Usuario['rol'],
  password: '',
  activo: true,
};

export default function UsuarioModal({
  isOpen,
  mode,
  usuario,
  departamentos = [],
  onClose,
  onSubmit,
}: UsuarioModalProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_FORM);
      setErrors({});
      return;
    }

    if (usuario && mode === 'edit') {
      setForm({
        nombre: usuario.nombre ?? '',
        apellido: usuario.apellido ?? '',
        email: usuario.email ?? '',
        telefono: usuario.telefono ?? '',
        departamento: usuario.departamento ?? '',
        rol: usuario.rol,
        password: '',
        activo: usuario.activo,
      });
      setErrors({});
      return;
    }

    setForm(DEFAULT_FORM);
    setErrors({});
  }, [isOpen, usuario, mode]);

  const rolOptions: Array<{ value: Usuario['rol']; label: string }> = useMemo(() => ([
    { value: 'admin', label: 'Administrador' },
    { value: 'responsable', label: 'Responsable' },
    { value: 'usuario', label: 'Usuario' },
  ]), []);

  if (!isOpen) {
    return null;
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!form.email.trim()) newErrors.email = 'El correo es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Correo inválido';

    if (mode === 'create' && !form.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    }

    if (form.password) {
      // Validar según Cognito password policy
      if (form.password.length < 8) {
        newErrors.password = 'Debe contener al menos 8 caracteres';
      } else if (!/[a-z]/.test(form.password)) {
        newErrors.password = 'Debe contener al menos una letra minúscula';
      } else if (!/[A-Z]/.test(form.password)) {
        newErrors.password = 'Debe contener al menos una letra mayúscula';
      } else if (!/[0-9]/.test(form.password)) {
        newErrors.password = 'Debe contener al menos un número';
      }
    }

    if (!form.departamento.trim()) newErrors.departamento = 'El departamento es requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<Usuario> & { password?: string } = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || undefined,
        email: form.email.trim(),
        telefono: form.telefono.trim() || undefined,
        departamento: form.departamento.trim() || undefined,
        rol: form.rol,
        activo: form.activo,
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error al guardar usuario', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Crear Usuario' : 'Editar Usuario'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div>
            <h3 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wide text-gray-500">
              <User className="mr-2 h-4 w-4" />
              Información Personal
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Nombre *"
                value={form.nombre}
                onChange={(value) => setForm((prev) => ({ ...prev, nombre: value }))}
                error={errors.nombre}
              />
              <Input
                label="Apellido"
                value={form.apellido}
                onChange={(value) => setForm((prev) => ({ ...prev, apellido: value }))}
              />
              <Input
                label="Correo electrónico *"
                type="email"
                value={form.email}
                onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                error={errors.email}
              />
              <Input
                label="Teléfono"
                value={form.telefono}
                onChange={(value) => setForm((prev) => ({ ...prev, telefono: value }))}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wide text-gray-500">
              <Building2 className="mr-2 h-4 w-4" />
              Información Organizacional
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="usuario-departamento" className="mb-1 block text-sm font-medium text-gray-700">
                  Departamento *
                </label>
                <select
                  id="usuario-departamento"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.departamento}
                  onChange={(event) => setForm((prev) => ({ ...prev, departamento: event.target.value }))}
                >
                  <option value="">Seleccionar departamento</option>
                  {departamentos.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.departamento && (
                  <p className="mt-1 text-sm text-red-600">{errors.departamento}</p>
                )}
              </div>
              <div>
                <label htmlFor="usuario-rol" className="mb-1 block text-sm font-medium text-gray-700">
                  Rol *
                </label>
                <div className="relative">
                  <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    id="usuario-rol"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.rol}
                    onChange={(event) => setForm((prev) => ({ ...prev, rol: event.target.value as Usuario['rol'] }))}
                  >
                    {rolOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="usuario-estado" className="mb-1 block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  id="usuario-estado"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.activo ? 'activo' : 'inactivo'}
                  onChange={(event) => setForm((prev) => ({ ...prev, activo: event.target.value === 'activo' }))}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wide text-gray-500">
              <Lock className="mr-2 h-4 w-4" />
              Seguridad
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={mode === 'create' ? 'Contraseña *' : 'Contraseña (opcional)'}
                type="password"
                value={form.password}
                onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
                error={errors.password}
                placeholder={mode === 'create' ? 'Mín. 8 caracteres, mayúsculas, minúsculas y números' : ''}
              />
            </div>
            {mode === 'edit' && (
              <p className="mt-1 text-sm text-gray-500">
                Deja la contraseña en blanco si no deseas modificarla.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            <Save className="mr-2 h-4 w-4" />
            {mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
