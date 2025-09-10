"""
Configuración de DynamoDB para el Sistema de Gestión de Espacios
Este script crea todas las tablas necesarias en DynamoDB manteniendo los mismos nombres 
y estructura del sistema Django convertido.
"""

import boto3
from botocore.exceptions import ClientError
import json
from datetime import datetime, date
from decimal import Decimal

class DynamoDBSetup:
    def __init__(self, region_name='us-east-1', endpoint_url=None):
        """
        Inicializa la configuración de DynamoDB
        
        Args:
            region_name (str): Región de AWS
            endpoint_url (str): URL del endpoint (para DynamoDB local usar http://localhost:8000)
        """
        if endpoint_url:
            # Para DynamoDB local
            self.dynamodb = boto3.resource('dynamodb', 
                                         region_name=region_name,
                                         endpoint_url=endpoint_url,
                                         aws_access_key_id='fake',
                                         aws_secret_access_key='fake')
        else:
            # Para DynamoDB en AWS
            self.dynamodb = boto3.resource('dynamodb', region_name=region_name)
        
        self.tables_config = self._get_tables_configuration()
    
    def _get_tables_configuration(self):
        """
        Define la configuración de todas las tablas del sistema
        """
        return {
            'zona': {
                'TableName': 'zona',
                'KeySchema': [
                    {'AttributeName': 'idzona', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idzona', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'tipoactividad': {
                'TableName': 'tipoactividad',
                'KeySchema': [
                    {'AttributeName': 'idtipoactividad', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idtipoactividad', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'estado': {
                'TableName': 'estado',
                'KeySchema': [
                    {'AttributeName': 'idestado', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idestado', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'estadoespacio': {
                'TableName': 'estadoespacio',
                'KeySchema': [
                    {'AttributeName': 'idestadoespacio', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idestadoespacio', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'estadorecurso': {
                'TableName': 'estadorecurso',
                'KeySchema': [
                    {'AttributeName': 'idestadorecurso', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idestadorecurso', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'recurso': {
                'TableName': 'recurso',
                'KeySchema': [
                    {'AttributeName': 'idrecurso', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idrecurso', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'responsable': {
                'TableName': 'responsable',
                'KeySchema': [
                    {'AttributeName': 'rutresponsable', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'rutresponsable', 'AttributeType': 'S'},
                    {'AttributeName': 'idtipoactividad', 'AttributeType': 'N'}
                ],
                'GlobalSecondaryIndexes': [
                    {
                        'IndexName': 'tipoactividad-index',
                        'KeySchema': [
                            {'AttributeName': 'idtipoactividad', 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'BillingMode': 'PAY_PER_REQUEST'
                    }
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'usuario': {
                'TableName': 'usuario',
                'KeySchema': [
                    {'AttributeName': 'rutusuario', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'rutusuario', 'AttributeType': 'S'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'espacio': {
                'TableName': 'espacio',
                'KeySchema': [
                    {'AttributeName': 'idespacio', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idespacio', 'AttributeType': 'N'},
                    {'AttributeName': 'idzona', 'AttributeType': 'N'},
                    {'AttributeName': 'idestadoespacio', 'AttributeType': 'N'}
                ],
                'GlobalSecondaryIndexes': [
                    {
                        'IndexName': 'zona-index',
                        'KeySchema': [
                            {'AttributeName': 'idzona', 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'BillingMode': 'PAY_PER_REQUEST'
                    },
                    {
                        'IndexName': 'estadoespacio-index',
                        'KeySchema': [
                            {'AttributeName': 'idestadoespacio', 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'BillingMode': 'PAY_PER_REQUEST'
                    }
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'tiporeserva': {
                'TableName': 'tiporeserva',
                'KeySchema': [
                    {'AttributeName': 'idtiporeserva', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idtiporeserva', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'reserva': {
                'TableName': 'reserva',
                'KeySchema': [
                    {'AttributeName': 'idreserva', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idreserva', 'AttributeType': 'N'},
                    {'AttributeName': 'idespacio', 'AttributeType': 'N'},
                    {'AttributeName': 'fechareserva', 'AttributeType': 'S'},
                    {'AttributeName': 'rutusuario', 'AttributeType': 'S'},
                    {'AttributeName': 'rutresponsable', 'AttributeType': 'S'}
                ],
                'GlobalSecondaryIndexes': [
                    {
                        'IndexName': 'espacio-fecha-index',
                        'KeySchema': [
                            {'AttributeName': 'idespacio', 'KeyType': 'HASH'},
                            {'AttributeName': 'fechareserva', 'KeyType': 'RANGE'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'BillingMode': 'PAY_PER_REQUEST'
                    },
                    {
                        'IndexName': 'usuario-index',
                        'KeySchema': [
                            {'AttributeName': 'rutusuario', 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'BillingMode': 'PAY_PER_REQUEST'
                    },
                    {
                        'IndexName': 'responsable-index',
                        'KeySchema': [
                            {'AttributeName': 'rutresponsable', 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'BillingMode': 'PAY_PER_REQUEST'
                    }
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            # Tablas de relación many-to-many
            'tipoactividadresponsable': {
                'TableName': 'tipoactividadresponsable',
                'KeySchema': [
                    {'AttributeName': 'idtipoactividad', 'KeyType': 'HASH'},
                    {'AttributeName': 'rutresponsable', 'KeyType': 'RANGE'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idtipoactividad', 'AttributeType': 'N'},
                    {'AttributeName': 'rutresponsable', 'AttributeType': 'S'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'tipoactividadespacio': {
                'TableName': 'tipoactividadespacio',
                'KeySchema': [
                    {'AttributeName': 'idtipoactividad', 'KeyType': 'HASH'},
                    {'AttributeName': 'idespacio', 'KeyType': 'RANGE'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idtipoactividad', 'AttributeType': 'N'},
                    {'AttributeName': 'idespacio', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            },
            
            'espaciorecurso': {
                'TableName': 'espaciorecurso',
                'KeySchema': [
                    {'AttributeName': 'idrecurso', 'KeyType': 'HASH'},
                    {'AttributeName': 'idespacio', 'KeyType': 'RANGE'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'idrecurso', 'AttributeType': 'N'},
                    {'AttributeName': 'idespacio', 'AttributeType': 'N'}
                ],
                'BillingMode': 'PAY_PER_REQUEST'
            }
        }
    
    def create_table(self, table_name):
        """
        Crea una tabla específica en DynamoDB
        """
        try:
            config = self.tables_config[table_name]
            table = self.dynamodb.create_table(**config)
            print(f"Creando tabla {table_name}...")
            table.wait_until_exists()
            print(f"✅ Tabla {table_name} creada exitosamente")
            return table
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceInUseException':
                print(f"⚠️  La tabla {table_name} ya existe")
                return self.dynamodb.Table(table_name)
            else:
                print(f"❌ Error creando tabla {table_name}: {e}")
                return None
        except Exception as e:
            print(f"❌ Error inesperado creando tabla {table_name}: {e}")
            return None
    
    def create_all_tables(self):
        """
        Crea todas las tablas del sistema
        """
        print("🚀 Iniciando creación de tablas DynamoDB para el Sistema de Gestión de Espacios")
        print("=" * 80)
        
        created_tables = {}
        
        # Orden de creación (tablas independientes primero)
        creation_order = [
            'zona', 'tipoactividad', 'estado', 'estadoespacio', 'estadorecurso',
            'recurso', 'responsable', 'usuario', 'espacio', 'tiporeserva', 'reserva',
            'tipoactividadresponsable', 'tipoactividadespacio', 'espaciorecurso'
        ]
        
        for table_name in creation_order:
            table = self.create_table(table_name)
            if table:
                created_tables[table_name] = table
        
        print("=" * 80)
        print(f"✅ Proceso completado. {len(created_tables)} tablas procesadas")
        return created_tables
    
    def delete_table(self, table_name):
        """
        Elimina una tabla específica
        """
        try:
            table = self.dynamodb.Table(table_name)
            table.delete()
            print(f"🗑️  Eliminando tabla {table_name}...")
            table.wait_until_not_exists()
            print(f"✅ Tabla {table_name} eliminada exitosamente")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                print(f"⚠️  La tabla {table_name} no existe")
            else:
                print(f"❌ Error eliminando tabla {table_name}: {e}")
        except Exception as e:
            print(f"❌ Error inesperado eliminando tabla {table_name}: {e}")
    
    def list_tables(self):
        """
        Lista todas las tablas en DynamoDB
        """
        try:
            tables = list(self.dynamodb.tables.all())
            table_names = [table.name for table in tables]
            print("📋 Tablas existentes en DynamoDB:")
            for name in sorted(table_names):
                print(f"  - {name}")
            return table_names
        except Exception as e:
            print(f"❌ Error listando tablas: {e}")
            return []
    
    def populate_initial_data(self):
        """
        Inserta datos iniciales en las tablas
        """
        print("📝 Insertando datos iniciales...")
        
        # Datos para tabla zona
        zona_table = self.dynamodb.Table('zona')
        zonas = [
            {'idzona': 1, 'nombrezona': 'Zona Norte'},
            {'idzona': 2, 'nombrezona': 'Zona Sur'},
            {'idzona': 3, 'nombrezona': 'Zona Este'},
            {'idzona': 4, 'nombrezona': 'Zona Oeste'},
            {'idzona': 5, 'nombrezona': 'Zona Central'}
        ]
        
        for zona in zonas:
            try:
                zona_table.put_item(Item=zona)
                print(f"  ✅ Zona insertada: {zona['nombrezona']}")
            except Exception as e:
                print(f"  ❌ Error insertando zona {zona['nombrezona']}: {e}")
        
        # Datos para tabla tipoactividad
        tipoactividad_table = self.dynamodb.Table('tipoactividad')
        tipos_actividad = [
            {'idtipoactividad': 1, 'nombretipoactividad': 'Reuniones'},
            {'idtipoactividad': 2, 'nombretipoactividad': 'Capacitación'},
            {'idtipoactividad': 3, 'nombretipoactividad': 'Eventos'},
            {'idtipoactividad': 4, 'nombretipoactividad': 'Conferencias'},
            {'idtipoactividad': 5, 'nombretipoactividad': 'Talleres'}
        ]
        
        for tipo in tipos_actividad:
            try:
                tipoactividad_table.put_item(Item=tipo)
                print(f"  ✅ Tipo de actividad insertado: {tipo['nombretipoactividad']}")
            except Exception as e:
                print(f"  ❌ Error insertando tipo de actividad {tipo['nombretipoactividad']}: {e}")
        
        # Datos para tabla estado
        estado_table = self.dynamodb.Table('estado')
        estados = [
            {'idestado': 1, 'descripcionestado': 'Confirmada'},
            {'idestado': 2, 'descripcionestado': 'Pendiente'},
            {'idestado': 3, 'descripcionestado': 'Cancelada'},
            {'idestado': 4, 'descripcionestado': 'Completada'}
        ]
        
        for estado in estados:
            try:
                estado_table.put_item(Item=estado)
                print(f"  ✅ Estado insertado: {estado['descripcionestado']}")
            except Exception as e:
                print(f"  ❌ Error insertando estado {estado['descripcionestado']}: {e}")
        
        # Datos para tabla estadoespacio
        estadoespacio_table = self.dynamodb.Table('estadoespacio')
        estados_espacio = [
            {'idestadoespacio': 1, 'descripcionestadoespacio': 'Disponible'},
            {'idestadoespacio': 2, 'descripcionestadoespacio': 'Ocupado'},
            {'idestadoespacio': 3, 'descripcionestadoespacio': 'En Mantenimiento'},
            {'idestadoespacio': 4, 'descripcionestadoespacio': 'Fuera de Servicio'}
        ]
        
        for estado in estados_espacio:
            try:
                estadoespacio_table.put_item(Item=estado)
                print(f"  ✅ Estado de espacio insertado: {estado['descripcionestadoespacio']}")
            except Exception as e:
                print(f"  ❌ Error insertando estado de espacio {estado['descripcionestadoespacio']}: {e}")
        
        # Datos para tabla estadorecurso
        estadorecurso_table = self.dynamodb.Table('estadorecurso')
        estados_recurso = [
            {'idestadorecurso': 1, 'descripcion': 'Disponible'},
            {'idestadorecurso': 2, 'descripcion': 'En Uso'},
            {'idestadorecurso': 3, 'descripcion': 'No Disponible'},
            {'idestadorecurso': 4, 'descripcion': 'En Reparación'}
        ]
        
        for estado in estados_recurso:
            try:
                estadorecurso_table.put_item(Item=estado)
                print(f"  ✅ Estado de recurso insertado: {estado['descripcion']}")
            except Exception as e:
                print(f"  ❌ Error insertando estado de recurso {estado['descripcion']}: {e}")
        
        # Datos para tabla tiporeserva
        tiporeserva_table = self.dynamodb.Table('tiporeserva')
        tipos_reserva = [
            {'idtiporeserva': 1, 'tiporeserva': 'Reserva General'},
            {'idtiporeserva': 2, 'tiporeserva': 'Reserva Especial'},
            {'idtiporeserva': 3, 'tiporeserva': 'Reserva VIP'},
            {'idtiporeserva': 4, 'tiporeserva': 'Reserva de Mantenimiento'}
        ]
        
        for tipo in tipos_reserva:
            try:
                tiporeserva_table.put_item(Item=tipo)
                print(f"  ✅ Tipo de reserva insertado: {tipo['tiporeserva']}")
            except Exception as e:
                print(f"  ❌ Error insertando tipo de reserva {tipo['tiporeserva']}: {e}")
        
        print("✅ Datos iniciales insertados correctamente")


def main():
    """
    Función principal para ejecutar la configuración
    """
    print("🏗️  Configurador de DynamoDB - Sistema de Gestión de Espacios")
    print("=" * 60)
    
    # Para DynamoDB local (descomenta la siguiente línea si usas DynamoDB local)
    # dynamodb_setup = DynamoDBSetup(endpoint_url='http://localhost:8000')
    
    # Para DynamoDB en AWS (asegúrate de tener configuradas las credenciales)
    dynamodb_setup = DynamoDBSetup()
    
    # Mostrar opciones
    print("\nOpciones disponibles:")
    print("1. Crear todas las tablas")
    print("2. Listar tablas existentes")
    print("3. Crear tablas e insertar datos iniciales")
    print("4. Solo insertar datos iniciales")
    
    try:
        # Opción automática: crear tablas e insertar datos
        print("\n🚀 Ejecutando creación completa...")
        tables = dynamodb_setup.create_all_tables()
        
        if tables:
            print("\n📝 Insertando datos iniciales...")
            dynamodb_setup.populate_initial_data()
            
        print("\n✅ Configuración de DynamoDB completada exitosamente!")
        print("\n📊 Resumen de tablas creadas:")
        dynamodb_setup.list_tables()
        
    except Exception as e:
        print(f"\n❌ Error durante la configuración: {e}")


if __name__ == "__main__":
    main()
