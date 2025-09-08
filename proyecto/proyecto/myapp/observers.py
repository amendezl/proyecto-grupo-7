class ImplementoObserver:
    def notificar(self, implemento, estado_anterior, estado_nuevo):
        raise NotImplementedError

class AlertaCambioEstadoImplemento(ImplementoObserver):
    def notificar(self, implemento, estado_anterior, estado_nuevo):
        estados = {
            1: 'Disponible',
            2: 'En reparación',
            3: 'Fuera de servicio'
        }
        mensaje = (f"Alerta: El implemento '{implemento.nombreimplemento}' "
                  f"cambió de {estados.get(estado_anterior, 'Desconocido')} "
                  f"a {estados.get(estado_nuevo, 'Desconocido')}")
        print(mensaje)

class NotificadorCambioEstado:
    def _init_(self):
        self.observers = [AlertaCambioEstadoImplemento()]

    def notificar(self, implemento, estado_anterior, estado_nuevo):
        for obs in self.observers:
            obs.notificar(implemento, estado_anterior, estado_nuevo)