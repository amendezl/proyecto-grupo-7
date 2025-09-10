"""
DynamoDB Operations - Sistema de Gestión de Espacios
Este archivo contiene las operaciones CRUD para interactuar con DynamoDB
imitando el comportamiento del ORM de Django.
"""

import boto3
from botocore.exceptions import ClientError
from decimal import Decimal
from datetime import datetime, date, time
import json
from typing import Dict, List, Optional, Any


class DynamoDBManager:
    """
    Gestor para operaciones con DynamoDB que replican el comportamiento de Django ORM
    """
    
    def __init__(self, region_name='us-east-1', endpoint_url=None):
        """
        Inicializa el gestor de DynamoDB
        """
        if endpoint_url:
            # Para DynamoDB local
            self.dynamodb = boto3.resource('dynamodb', 
                                         region_name=region_name,
                                         endpoint_url=endpoint_url,
                                         aws_access_key_id='fake',
                                         aws_secret_access_key='fake')
            self.client = boto3.client('dynamodb',
                                     region_name=region_name,
                                     endpoint_url=endpoint_url,
                                     aws_access_key_id='fake',
                                     aws_secret_access_key='fake')
        else:
            # Para DynamoDB en AWS
            self.dynamodb = boto3.resource('dynamodb', region_name=region_name)
            self.client = boto3.client('dynamodb', region_name=region_name)
    
    def _convert_to_dynamodb_format(self, item: Dict) -> Dict:
        """
        Convierte un diccionario Python al formato de DynamoDB
        """
        def convert_value(value):
            if isinstance(value, str):
                return value
            elif isinstance(value, (int, float)):
                return Decimal(str(value))
            elif isinstance(value, bool):
                return value
            elif isinstance(value, (date, datetime)):
                return value.isoformat()
            elif isinstance(value, time):
                return value.isoformat()
            elif value is None:
                return None
            else:
                return str(value)
        
        return {k: convert_value(v) for k, v in item.items() if v is not None}
    
    def _convert_from_dynamodb_format(self, item: Dict) -> Dict:
        """
        Convierte un item de DynamoDB al formato Python
        """
        def convert_value(value):
            if isinstance(value, Decimal):
                # Convertir Decimal a int si no tiene decimales, sino a float
                if value % 1 == 0:
                    return int(value)
                else:
                    return float(value)
            return value
        
        return {k: convert_value(v) for k, v in item.items()}


class ZonaManager(DynamoDBManager):
    """Operaciones para la tabla zona"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.table = self.dynamodb.Table('zona')
    
    def create(self, nombrezona: str) -> Dict:
        """Crear nueva zona"""
        # Obtener el próximo ID
        response = self.table.scan()
        max_id = 0
        if response['Items']:
            max_id = max([item['idzona'] for item in response['Items']])
        
        item = {
            'idzona': max_id + 1,
            'nombrezona': nombrezona
        }
        
        self.table.put_item(Item=self._convert_to_dynamodb_format(item))
        return item
    
    def get(self, idzona: int) -> Optional[Dict]:
        """Obtener zona por ID"""
        try:
            response = self.table.get_item(Key={'idzona': idzona})
            return self._convert_from_dynamodb_format(response.get('Item'))
        except ClientError:
            return None
    
    def all(self) -> List[Dict]:
        """Obtener todas las zonas"""
        response = self.table.scan()
        return [self._convert_from_dynamodb_format(item) for item in response['Items']]
    
    def filter(self, **kwargs) -> List[Dict]:
        """Filtrar zonas"""
        # Implementación básica de filtrado
        items = self.all()
        for key, value in kwargs.items():
            items = [item for item in items if item.get(key) == value]
        return items


class EspacioManager(DynamoDBManager):
    """Operaciones para la tabla espacio"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.table = self.dynamodb.Table('espacio')
    
    def create(self, idzona: int, numeroespacio: int, idestadoespacio: int, 
               tipoactividadespacio: str = None) -> Dict:
        """Crear nuevo espacio"""
        response = self.table.scan()
        max_id = 0
        if response['Items']:
            max_id = max([item['idespacio'] for item in response['Items']])
        
        item = {
            'idespacio': max_id + 1,
            'idzona': idzona,
            'numeroespacio': numeroespacio,
            'idestadoespacio': idestadoespacio,
            'tipoactividadespacio': tipoactividadespacio
        }
        
        self.table.put_item(Item=self._convert_to_dynamodb_format(item))
        return item
    
    def get(self, idespacio: int) -> Optional[Dict]:
        """Obtener espacio por ID"""
        try:
            response = self.table.get_item(Key={'idespacio': idespacio})
            return self._convert_from_dynamodb_format(response.get('Item'))
        except ClientError:
            return None
    
    def all(self) -> List[Dict]:
        """Obtener todos los espacios"""
        response = self.table.scan()
        return [self._convert_from_dynamodb_format(item) for item in response['Items']]
    
    def filter_by_zona(self, idzona: int) -> List[Dict]:
        """Filtrar espacios por zona usando GSI"""
        try:
            response = self.table.query(
                IndexName='zona-index',
                KeyConditionExpression='idzona = :zona_id',
                ExpressionAttributeValues={':zona_id': idzona}
            )
            return [self._convert_from_dynamodb_format(item) for item in response['Items']]
        except ClientError:
            return []
    
    def filter_by_estado(self, idestadoespacio: int) -> List[Dict]:
        """Filtrar espacios por estado usando GSI"""
        try:
            response = self.table.query(
                IndexName='estadoespacio-index',
                KeyConditionExpression='idestadoespacio = :estado_id',
                ExpressionAttributeValues={':estado_id': idestadoespacio}
            )
            return [self._convert_from_dynamodb_format(item) for item in response['Items']]
        except ClientError:
            return []


class ReservaManager(DynamoDBManager):
    """Operaciones para la tabla reserva"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.table = self.dynamodb.Table('reserva')
    
    def create(self, idespacio: int, fechareserva: str, horainicio: str, 
               horafin: str, idtiporeserva: int, rutusuario: str = None, 
               rutresponsable: str = None, idestado: int = 1) -> Dict:
        """Crear nueva reserva"""
        response = self.table.scan()
        max_id = 0
        if response['Items']:
            max_id = max([item['idreserva'] for item in response['Items']])
        
        item = {
            'idreserva': max_id + 1,
            'idespacio': idespacio,
            'fechareserva': fechareserva,
            'horainicio': horainicio,
            'horafin': horafin,
            'idtiporeserva': idtiporeserva,
            'rutusuario': rutusuario,
            'rutresponsable': rutresponsable,
            'idestado': idestado
        }
        
        self.table.put_item(Item=self._convert_to_dynamodb_format(item))
        return item
    
    def get(self, idreserva: int) -> Optional[Dict]:
        """Obtener reserva por ID"""
        try:
            response = self.table.get_item(Key={'idreserva': idreserva})
            return self._convert_from_dynamodb_format(response.get('Item'))
        except ClientError:
            return None
    
    def filter_by_espacio_fecha(self, idespacio: int, fechareserva: str) -> List[Dict]:
        """Filtrar reservas por espacio y fecha usando GSI"""
        try:
            response = self.table.query(
                IndexName='espacio-fecha-index',
                KeyConditionExpression='idespacio = :espacio_id AND fechareserva = :fecha',
                ExpressionAttributeValues={
                    ':espacio_id': idespacio,
                    ':fecha': fechareserva
                }
            )
            return [self._convert_from_dynamodb_format(item) for item in response['Items']]
        except ClientError:
            return []
    
    def filter_by_usuario(self, rutusuario: str) -> List[Dict]:
        """Filtrar reservas por usuario usando GSI"""
        try:
            response = self.table.query(
                IndexName='usuario-index',
                KeyConditionExpression='rutusuario = :rut',
                ExpressionAttributeValues={':rut': rutusuario}
            )
            return [self._convert_from_dynamodb_format(item) for item in response['Items']]
        except ClientError:
            return []
    
    def check_conflicts(self, idespacio: int, fechareserva: str, 
                       horainicio: str, horafin: str) -> bool:
        """Verificar conflictos de horario"""
        reservas = self.filter_by_espacio_fecha(idespacio, fechareserva)
        
        for reserva in reservas:
            reserva_inicio = reserva.get('horainicio', '')
            reserva_fin = reserva.get('horafin', '')
            
            # Verificar solapamiento de horarios
            if (horainicio < reserva_fin and horafin > reserva_inicio):
                return True
        
        return False


class ResponsableManager(DynamoDBManager):
    """Operaciones para la tabla responsable"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.table = self.dynamodb.Table('responsable')
    
    def create(self, rutresponsable: str, nombreresponsable: str, 
               apellidoresponsable: str, idtipoactividad: int = None,
               fechanacimientoresponsable: str = None) -> Dict:
        """Crear nuevo responsable"""
        item = {
            'rutresponsable': rutresponsable,
            'nombreresponsable': nombreresponsable,
            'apellidoresponsable': apellidoresponsable,
            'idtipoactividad': idtipoactividad,
            'fechanacimientoresponsable': fechanacimientoresponsable
        }
        
        self.table.put_item(Item=self._convert_to_dynamodb_format(item))
        return item
    
    def get(self, rutresponsable: str) -> Optional[Dict]:
        """Obtener responsable por RUT"""
        try:
            response = self.table.get_item(Key={'rutresponsable': rutresponsable})
            return self._convert_from_dynamodb_format(response.get('Item'))
        except ClientError:
            return None
    
    def all(self) -> List[Dict]:
        """Obtener todos los responsables"""
        response = self.table.scan()
        return [self._convert_from_dynamodb_format(item) for item in response['Items']]


class UsuarioManager(DynamoDBManager):
    """Operaciones para la tabla usuario"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.table = self.dynamodb.Table('usuario')
    
    def create(self, rutusuario: str, nombreusuario: str, 
               apellidousuario: str, fechanacimientousuario: str = None) -> Dict:
        """Crear nuevo usuario"""
        item = {
            'rutusuario': rutusuario,
            'nombreusuario': nombreusuario,
            'apellidousuario': apellidousuario,
            'fechanacimientousuario': fechanacimientousuario
        }
        
        self.table.put_item(Item=self._convert_to_dynamodb_format(item))
        return item
    
    def get(self, rutusuario: str) -> Optional[Dict]:
        """Obtener usuario por RUT"""
        try:
            response = self.table.get_item(Key={'rutusuario': rutusuario})
            return self._convert_from_dynamodb_format(response.get('Item'))
        except ClientError:
            return None
    
    def all(self) -> List[Dict]:
        """Obtener todos los usuarios"""
        response = self.table.scan()
        return [self._convert_from_dynamodb_format(item) for item in response['Items']]


class EspacioRecursoManager(DynamoDBManager):
    """Operaciones para la tabla espaciorecurso (relación many-to-many)"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.table = self.dynamodb.Table('espaciorecurso')
    
    def create(self, idrecurso: int, idespacio: int, idestadorecurso: int = 1) -> Dict:
        """Asignar recurso a espacio"""
        item = {
            'idrecurso': idrecurso,
            'idespacio': idespacio,
            'idestadorecurso': idestadorecurso
        }
        
        self.table.put_item(Item=self._convert_to_dynamodb_format(item))
        return item
    
    def get(self, idrecurso: int, idespacio: int) -> Optional[Dict]:
        """Obtener relación específica"""
        try:
            response = self.table.get_item(Key={
                'idrecurso': idrecurso,
                'idespacio': idespacio
            })
            return self._convert_from_dynamodb_format(response.get('Item'))
        except ClientError:
            return None
    
    def filter_by_espacio(self, idespacio: int) -> List[Dict]:
        """Obtener todos los recursos de un espacio"""
        try:
            response = self.table.query(
                KeyConditionExpression='idespacio = :espacio_id',
                ExpressionAttributeValues={':espacio_id': idespacio}
            )
            return [self._convert_from_dynamodb_format(item) for item in response['Items']]
        except ClientError:
            return []
    
    def update_estado(self, idrecurso: int, idespacio: int, nuevo_estado: int) -> bool:
        """Actualizar estado de un recurso en un espacio"""
        try:
            self.table.update_item(
                Key={
                    'idrecurso': idrecurso,
                    'idespacio': idespacio
                },
                UpdateExpression='SET idestadorecurso = :estado',
                ExpressionAttributeValues={':estado': nuevo_estado}
            )
            return True
        except ClientError:
            return False


# Clase principal que agrupa todos los managers
class DynamoDBClient:
    """
    Cliente principal para acceder a todas las operaciones de DynamoDB
    Simula el comportamiento de los modelos de Django
    """
    
    def __init__(self, region_name='us-east-1', endpoint_url=None):
        """
        Inicializa el cliente con todos los managers
        """
        self.zona = ZonaManager(region_name=region_name, endpoint_url=endpoint_url)
        self.espacio = EspacioManager(region_name=region_name, endpoint_url=endpoint_url)
        self.reserva = ReservaManager(region_name=region_name, endpoint_url=endpoint_url)
        self.responsable = ResponsableManager(region_name=region_name, endpoint_url=endpoint_url)
        self.usuario = UsuarioManager(region_name=region_name, endpoint_url=endpoint_url)
        self.espaciorecurso = EspacioRecursoManager(region_name=region_name, endpoint_url=endpoint_url)


# Ejemplo de uso
def ejemplo_uso():
    """
    Ejemplos de cómo usar el cliente de DynamoDB
    """
    # Inicializar cliente (usar endpoint_url para DynamoDB local)
    # client = DynamoDBClient(endpoint_url='http://localhost:8000')
    client = DynamoDBClient()
    
    print("🔧 Ejemplos de uso del cliente DynamoDB")
    print("=" * 50)
    
    # Crear zona
    print("\n1. Creando zona...")
    zona = client.zona.create("Zona Ejemplo")
    print(f"   Zona creada: {zona}")
    
    # Crear espacio
    print("\n2. Creando espacio...")
    espacio = client.espacio.create(
        idzona=zona['idzona'],
        numeroespacio=101,
        idestadoespacio=1,
        tipoactividadespacio="Sala de reuniones"
    )
    print(f"   Espacio creado: {espacio}")
    
    # Crear usuario
    print("\n3. Creando usuario...")
    usuario = client.usuario.create(
        rutusuario="12345678-9",
        nombreusuario="Juan",
        apellidousuario="Pérez"
    )
    print(f"   Usuario creado: {usuario}")
    
    # Crear reserva
    print("\n4. Creando reserva...")
    reserva = client.reserva.create(
        idespacio=espacio['idespacio'],
        fechareserva="2025-09-15",
        horainicio="09:00:00",
        horafin="10:00:00",
        idtiporeserva=1,
        rutusuario=usuario['rutusuario']
    )
    print(f"   Reserva creada: {reserva}")
    
    # Verificar conflictos
    print("\n5. Verificando conflictos...")
    conflicto = client.reserva.check_conflicts(
        idespacio=espacio['idespacio'],
        fechareserva="2025-09-15",
        horainicio="09:30:00",
        horafin="10:30:00"
    )
    print(f"   ¿Hay conflicto? {conflicto}")
    
    print("\n✅ Ejemplos completados")


if __name__ == "__main__":
    ejemplo_uso()
