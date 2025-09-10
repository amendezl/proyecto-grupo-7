"""
Configuración de Database Backend para el Sistema de Gestión de Espacios
Permite alternar entre SQLite (Django ORM) y DynamoDB
"""

import os
from typing import Optional, Dict, Any


class DatabaseConfig:
    """
    Configuración centralizada para el backend de base de datos
    """
    
    # Configuración por defecto
    DEFAULT_CONFIG = {
        'backend': 'sqlite',  # 'sqlite' o 'dynamodb'
        'dynamodb_endpoint': None,  # None para AWS, 'http://localhost:8000' para local
        'dynamodb_region': 'us-east-1',
        'auto_migrate': False
    }
    
    def __init__(self, config_file: str = 'db_config.json'):
        self.config_file = config_file
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Carga la configuración desde archivo o usa valores por defecto"""
        import json
        
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    return {**self.DEFAULT_CONFIG, **json.load(f)}
            except Exception as e:
                print(f"⚠️  Error cargando configuración: {e}")
                return self.DEFAULT_CONFIG.copy()
        
        return self.DEFAULT_CONFIG.copy()
    
    def save_config(self):
        """Guarda la configuración actual"""
        import json
        
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
            print(f"✅ Configuración guardada en {self.config_file}")
        except Exception as e:
            print(f"❌ Error guardando configuración: {e}")
    
    def get_backend(self) -> str:
        """Obtiene el backend actual"""
        return self.config.get('backend', 'sqlite')
    
    def set_backend(self, backend: str):
        """Establece el backend de base de datos"""
        if backend not in ['sqlite', 'dynamodb']:
            raise ValueError("Backend debe ser 'sqlite' o 'dynamodb'")
        
        self.config['backend'] = backend
        self.save_config()
        print(f"✅ Backend cambiado a: {backend}")
    
    def get_dynamodb_config(self) -> Dict[str, str]:
        """Obtiene la configuración de DynamoDB"""
        return {
            'endpoint_url': self.config.get('dynamodb_endpoint'),
            'region_name': self.config.get('dynamodb_region', 'us-east-1')
        }
    
    def set_dynamodb_config(self, endpoint_url: Optional[str] = None, 
                           region: str = 'us-east-1'):
        """Configura DynamoDB"""
        self.config['dynamodb_endpoint'] = endpoint_url
        self.config['dynamodb_region'] = region
        self.save_config()
        print(f"✅ DynamoDB configurado: region={region}, endpoint={endpoint_url}")


class DatabaseManager:
    """
    Manager unificado que abstrae las operaciones de base de datos
    """
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or DatabaseConfig()
        self._django_models = None
        self._dynamo_client = None
        
        # Inicializar backend apropiado
        if self.config.get_backend() == 'dynamodb':
            self._init_dynamodb()
        else:
            self._init_django()
    
    def _init_django(self):
        """Inicializa Django ORM"""
        try:
            import django
            from django.conf import settings
            
            if not settings.configured:
                os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vesperdevs.settings')
                django.setup()
            
            from myapp import models
            self._django_models = models
            print("✅ Django ORM inicializado")
            
        except Exception as e:
            print(f"❌ Error inicializando Django: {e}")
    
    def _init_dynamodb(self):
        """Inicializa DynamoDB"""
        try:
            from dynamodb_operations import DynamoDBClient
            
            dynamo_config = self.config.get_dynamodb_config()
            self._dynamo_client = DynamoDBClient(**dynamo_config)
            print("✅ DynamoDB cliente inicializado")
            
        except Exception as e:
            print(f"❌ Error inicializando DynamoDB: {e}")
    
    def get_zona_manager(self):
        """Obtiene el manager para zonas según el backend"""
        if self.config.get_backend() == 'dynamodb':
            return self._dynamo_client.zona if self._dynamo_client else None
        else:
            return self._django_models.Zona if self._django_models else None
    
    def get_espacio_manager(self):
        """Obtiene el manager para espacios según el backend"""
        if self.config.get_backend() == 'dynamodb':
            return self._dynamo_client.espacio if self._dynamo_client else None
        else:
            return self._django_models.Espacio if self._django_models else None
    
    def get_reserva_manager(self):
        """Obtiene el manager para reservas según el backend"""
        if self.config.get_backend() == 'dynamodb':
            return self._dynamo_client.reserva if self._dynamo_client else None
        else:
            return self._django_models.Reserva if self._django_models else None
    
    def get_usuario_manager(self):
        """Obtiene el manager para usuarios según el backend"""
        if self.config.get_backend() == 'dynamodb':
            return self._dynamo_client.usuario if self._dynamo_client else None
        else:
            return self._django_models.Usuario if self._django_models else None
    
    def get_responsable_manager(self):
        """Obtiene el manager para responsables según el backend"""
        if self.config.get_backend() == 'dynamodb':
            return self._dynamo_client.responsable if self._dynamo_client else None
        else:
            return self._django_models.Responsable if self._django_models else None
    
    def list_all_espacios(self):
        """Lista todos los espacios independientemente del backend"""
        manager = self.get_espacio_manager()
        
        if self.config.get_backend() == 'dynamodb':
            return manager.all() if manager else []
        else:
            return list(manager.objects.all()) if manager else []
    
    def create_reserva(self, **kwargs):
        """Crea una reserva independientemente del backend"""
        manager = self.get_reserva_manager()
        
        if self.config.get_backend() == 'dynamodb':
            return manager.create(**kwargs) if manager else None
        else:
            return manager.objects.create(**kwargs) if manager else None
    
    def check_reserva_conflicts(self, idespacio: int, fechareserva: str, 
                               horainicio: str, horafin: str) -> bool:
        """Verifica conflictos de reserva independientemente del backend"""
        if self.config.get_backend() == 'dynamodb':
            manager = self.get_reserva_manager()
            return manager.check_conflicts(idespacio, fechareserva, horainicio, horafin) if manager else False
        else:
            # Implementar lógica Django para verificar conflictos
            from django.db.models import Q
            manager = self.get_reserva_manager()
            
            if not manager:
                return False
            
            conflicts = manager.objects.filter(
                idespacio=idespacio,
                fechareserva=fechareserva
            ).filter(
                Q(horainicio__lt=horafin) & Q(horafin__gt=horainicio)
            )
            
            return conflicts.exists()


def setup_database_cli():
    """Interface de línea de comandos para configurar la base de datos"""
    import sys
    
    config = DatabaseConfig()
    
    if len(sys.argv) < 2:
        print("📋 Configuración actual:")
        print(f"   Backend: {config.get_backend()}")
        if config.get_backend() == 'dynamodb':
            dynamo_config = config.get_dynamodb_config()
            print(f"   DynamoDB Region: {dynamo_config['region_name']}")
            print(f"   DynamoDB Endpoint: {dynamo_config['endpoint_url'] or 'AWS Default'}")
        
        print("\n🔧 Comandos disponibles:")
        print("   python db_config.py sqlite          - Cambiar a SQLite")
        print("   python db_config.py dynamodb        - Cambiar a DynamoDB (AWS)")
        print("   python db_config.py dynamodb-local  - Cambiar a DynamoDB Local")
        print("   python db_config.py status          - Ver estado actual")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'sqlite':
        config.set_backend('sqlite')
        
    elif command == 'dynamodb':
        config.set_backend('dynamodb')
        config.set_dynamodb_config(endpoint_url=None, region='us-east-1')
        
    elif command == 'dynamodb-local':
        config.set_backend('dynamodb')
        config.set_dynamodb_config(endpoint_url='http://localhost:8000', region='us-east-1')
        
    elif command == 'status':
        manager = DatabaseManager(config)
        print(f"📊 Backend activo: {config.get_backend()}")
        
        # Probar conexión
        try:
            espacios = manager.list_all_espacios()
            print(f"✅ Conexión exitosa - {len(espacios)} espacios encontrados")
        except Exception as e:
            print(f"❌ Error de conexión: {e}")
    
    else:
        print(f"❌ Comando desconocido: {command}")


# Ejemplo de uso unificado
def ejemplo_uso_unificado():
    """Ejemplo de cómo usar el sistema con abstracción de backend"""
    
    # Inicializar manager (usa configuración automáticamente)
    db_manager = DatabaseManager()
    
    print(f"🔧 Usando backend: {db_manager.config.get_backend()}")
    
    # Estas operaciones funcionan igual independientemente del backend
    try:
        # Listar espacios
        espacios = db_manager.list_all_espacios()
        print(f"📋 Espacios disponibles: {len(espacios)}")
        
        # Verificar conflictos (ejemplo)
        conflicto = db_manager.check_reserva_conflicts(
            idespacio=1,
            fechareserva="2025-09-15",
            horainicio="09:00:00",
            horafin="10:00:00"
        )
        print(f"🔍 ¿Hay conflicto? {conflicto}")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    setup_database_cli()
