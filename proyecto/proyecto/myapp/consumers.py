import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone
import pytz
from django.db.models import Exists, OuterRef
from .models import Pasillo, Box, Consulta
from channels.db import database_sync_to_async

class EstadoBoxesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            await self.accept()
            self.running = True
            await self.enviar_estado()
            while self.running:
                await asyncio.sleep(3)
                if self.running:
                    await self.enviar_estado()
        except Exception as e:
            print(f"Error en conexión: {str(e)}")
            self.running = False

    async def disconnect(self, close_code):
        self.running = False
        print(f"Desconectando WebSocket con código: {close_code}")

    @database_sync_to_async
    def get_estado_boxes(self):
        tz = pytz.timezone('America/Santiago')
        now = timezone.now().astimezone(tz)
        current_date = now.date()
        current_time = now.time()

        pasillos = Pasillo.objects.all()
        pasillos_data = []

        for pasillo in pasillos:
            boxes = Box.objects.filter(idpasillo=pasillo).annotate(
                tiene_consulta_activa=Exists(
                    Consulta.objects.filter(
                        idbox=OuterRef('pk'),
                        fechaconsulta=current_date,
                        horainicio__lte=current_time,
                        horafin__gte=current_time
                    )
                )
            )

            boxes_data = []
            for box in boxes:
                if box.idestadobox.descripcionestadobox == "En mantención":
                    estado = "mantencion"
                else:
                    estado = "ocupado" if box.tiene_consulta_activa else "disponible"
                boxes_data.append({
                    'id': box.idbox,
                    'estado': estado
                })

            pasillos_data.append({
                'pasillo': pasillo.nombrepasillo,
                'boxes': boxes_data
            })

        return pasillos_data

    async def enviar_estado(self):
        try:
            pasillos_data = await self.get_estado_boxes()
            await self.send(text_data=json.dumps({
                'type': 'estado_boxes',
                'pasillos': pasillos_data
            }))
            print("Estado enviado correctamente")
        except Exception as e:
            print(f"Error al enviar estado: {str(e)}")