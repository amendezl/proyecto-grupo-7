"""
Migración de datos de SQLite a DynamoDB
Este script migra los datos existentes del sistema Django (SQLite) a DynamoDB
"""

import os
import sys
import django
from typing import Dict, List
import json
from datetime import datetime, date, time

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vesperdevs.settings')
django.setup()

from myapp.models import *
from dynamodb_operations import DynamoDBClient


class DataMigrator:
    """
    Migra datos desde Django/SQLite hacia DynamoDB
    """
    
    def __init__(self, endpoint_url=None):
        """
        Inicializa el migrador
        
        Args:
            endpoint_url: URL para DynamoDB local (opcional)
        """
        self.dynamo_client = DynamoDBClient(endpoint_url=endpoint_url)
        self.migration_log = []
    
    def log_migration(self, table: str, action: str, count: int, errors: int = 0):
        """Registra el progreso de migración"""
        self.migration_log.append({
            'table': table,
            'action': action,
            'count': count,
            'errors': errors,
            'timestamp': datetime.now().isoformat()
        })
        print(f"✅ {table}: {action} - {count} registros, {errors} errores")
    
    def convert_date_to_string(self, date_obj):
        """Convierte objetos date/datetime a string"""
        if isinstance(date_obj, (date, datetime)):
            return date_obj.isoformat()
        elif isinstance(date_obj, time):
            return date_obj.isoformat()
        return date_obj
    
    def migrate_zonas(self):
        """Migra tabla zona"""
        print("🔄 Migrando zonas...")
        
        try:
            zonas = Zona.objects.all()
            count = 0
            errors = 0
            
            for zona in zonas:
                try:
                    self.dynamo_client.zona.table.put_item(Item={
                        'idzona': zona.idzona,
                        'nombrezona': zona.nombrezona or ''
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando zona {zona.idzona}: {e}")
                    errors += 1
            
            self.log_migration('zona', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error general migrando zonas: {e}")
    
    def migrate_tipoactividad(self):
        """Migra tabla tipoactividad"""
        print("🔄 Migrando tipos de actividad...")
        
        try:
            tipos = TipoActividad.objects.all()
            count = 0
            errors = 0
            
            for tipo in tipos:
                try:
                    self.dynamo_client.zona.dynamodb.Table('tipoactividad').put_item(Item={
                        'idtipoactividad': tipo.idtipoactividad,
                        'nombretipoactividad': tipo.nombretipoactividad or ''
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando tipo actividad {tipo.idtipoactividad}: {e}")
                    errors += 1
            
            self.log_migration('tipoactividad', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error general migrando tipos de actividad: {e}")
    
    def migrate_estados(self):
        """Migra las tablas de estados"""
        print("🔄 Migrando estados...")
        
        # Estado general
        try:
            estados = Estado.objects.all()
            count = 0
            errors = 0
            
            for estado in estados:
                try:
                    self.dynamo_client.zona.dynamodb.Table('estado').put_item(Item={
                        'idestado': estado.idestado,
                        'descripcionestado': estado.descripcionestado or ''
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando estado {estado.idestado}: {e}")
                    errors += 1
            
            self.log_migration('estado', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error migrando estados: {e}")
        
        # Estado espacio
        try:
            estados_espacio = EstadoEspacio.objects.all()
            count = 0
            errors = 0
            
            for estado in estados_espacio:
                try:
                    self.dynamo_client.zona.dynamodb.Table('estadoespacio').put_item(Item={
                        'idestadoespacio': estado.idestadoespacio,
                        'descripcionestadoespacio': estado.descripcionestadoespacio or ''
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando estado espacio {estado.idestadoespacio}: {e}")
                    errors += 1
            
            self.log_migration('estadoespacio', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error migrando estados espacio: {e}")
        
        # Estado recurso
        try:
            estados_recurso = EstadoRecurso.objects.all()
            count = 0
            errors = 0
            
            for estado in estados_recurso:
                try:
                    self.dynamo_client.zona.dynamodb.Table('estadorecurso').put_item(Item={
                        'idestadorecurso': estado.idestadorecurso,
                        'descripcion': estado.descripcion or ''
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando estado recurso {estado.idestadorecurso}: {e}")
                    errors += 1
            
            self.log_migration('estadorecurso', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error migrando estados recurso: {e}")
    
    def migrate_recursos(self):
        """Migra tabla recurso"""
        print("🔄 Migrando recursos...")
        
        try:
            recursos = Recurso.objects.all()
            count = 0
            errors = 0
            
            for recurso in recursos:
                try:
                    self.dynamo_client.zona.dynamodb.Table('recurso').put_item(Item={
                        'idrecurso': recurso.idrecurso,
                        'nombrerecurso': recurso.nombrerecurso or ''
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando recurso {recurso.idrecurso}: {e}")
                    errors += 1
            
            self.log_migration('recurso', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error general migrando recursos: {e}")
    
    def migrate_responsables(self):
        """Migra tabla responsable"""
        print("🔄 Migrando responsables...")
        
        try:
            responsables = Responsable.objects.all()
            count = 0
            errors = 0
            
            for responsable in responsables:
                try:
                    item = {
                        'rutresponsable': responsable.rutresponsable,
                        'nombreresponsable': responsable.nombreresponsable or '',
                        'apellidoresponsable': responsable.apellidoresponsable or '',
                    }
                    
                    if responsable.idtipoactividad:
                        item['idtipoactividad'] = responsable.idtipoactividad.idtipoactividad
                    
                    if responsable.fechanacimientoresponsable:
                        item['fechanacimientoresponsable'] = self.convert_date_to_string(
                            responsable.fechanacimientoresponsable
                        )
                    
                    self.dynamo_client.responsable.table.put_item(Item=item)
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando responsable {responsable.rutresponsable}: {e}")
                    errors += 1
            
            self.log_migration('responsable', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error general migrando responsables: {e}")
    
    def migrate_usuarios(self):
        """Migra tabla usuario"""
        print("🔄 Migrando usuarios...")
        
        try:
            usuarios = Usuario.objects.all()
            count = 0
            errors = 0
            
            for usuario in usuarios:
                try:
                    item = {
                        'rutusuario': usuario.rutusuario,
                        'nombreusuario': usuario.nombreusuario or '',
                        'apellidousuario': usuario.apellidousuario or '',
                    }
                    
                    if usuario.fechanacimientousuario:
                        item['fechanacimientousuario'] = self.convert_date_to_string(
                            usuario.fechanacimientousuario
                        )
                    
                    self.dynamo_client.usuario.table.put_item(Item=item)
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando usuario {usuario.rutusuario}: {e}")
                    errors += 1
            
            self.log_migration('usuario', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error general migrando usuarios: {e}")
    
    def migrate_espacios(self):
        """Migra tabla espacio"""
        print("🔄 Migrando espacios...")
        
        try:
            espacios = Espacio.objects.all()
            count = 0
            errors = 0
            
            for espacio in espacios:
                try:
                    item = {
                        'idespacio': espacio.idespacio,
                        'numeroespacio': espacio.numeroespacio or 0,
                        'tipoactividadespacio': espacio.tipoactividadespacio or ''
                    }
                    
                    if espacio.idzona:
                        item['idzona'] = espacio.idzona.idzona
                    
                    if espacio.idestadoespacio:
                        item['idestadoespacio'] = espacio.idestadoespacio.idestadoespacio
                    
                    self.dynamo_client.espacio.table.put_item(Item=item)
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando espacio {espacio.idespacio}: {e}")
                    errors += 1
            
            self.log_migration('espacio', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error general migrando espacios: {e}")
    
    def migrate_tiporeserva(self):
        """Migra tabla tiporeserva"""
        print("🔄 Migrando tipos de reserva...")
        
        try:
            tipos = TipoReserva.objects.all()
            count = 0
            errors = 0
            
            for tipo in tipos:
                try:
                    self.dynamo_client.zona.dynamodb.Table('tiporeserva').put_item(Item={
                        'idtiporeserva': tipo.idtiporeserva,
                        'tiporeserva': tipo.tiporeserva or ''
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando tipo reserva {tipo.idtiporeserva}: {e}")
                    errors += 1
            
            self.log_migration('tiporeserva', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error general migrando tipos de reserva: {e}")
    
    def migrate_reservas(self):
        """Migra tabla reserva"""
        print("🔄 Migrando reservas...")
        
        try:
            reservas = Reserva.objects.all()
            count = 0
            errors = 0
            
            for reserva in reservas:
                try:
                    item = {
                        'idreserva': reserva.idreserva,
                    }
                    
                    if reserva.idespacio:
                        item['idespacio'] = reserva.idespacio.idespacio
                    
                    if reserva.rutusuario:
                        item['rutusuario'] = reserva.rutusuario.rutusuario
                    
                    if reserva.rutresponsable:
                        item['rutresponsable'] = reserva.rutresponsable.rutresponsable
                    
                    if reserva.idestado:
                        item['idestado'] = reserva.idestado.idestado
                    
                    if reserva.idtiporeserva:
                        item['idtiporeserva'] = reserva.idtiporeserva.idtiporeserva
                    
                    if reserva.fechareserva:
                        item['fechareserva'] = self.convert_date_to_string(reserva.fechareserva)
                    
                    if reserva.horainicio:
                        item['horainicio'] = self.convert_date_to_string(reserva.horainicio)
                    
                    if reserva.horafin:
                        item['horafin'] = self.convert_date_to_string(reserva.horafin)
                    
                    self.dynamo_client.reserva.table.put_item(Item=item)
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando reserva {reserva.idreserva}: {e}")
                    errors += 1
            
            self.log_migration('reserva', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error general migrando reservas: {e}")
    
    def migrate_relaciones(self):
        """Migra tablas de relaciones many-to-many"""
        print("🔄 Migrando relaciones...")
        
        # EspacioRecurso
        try:
            espacios_recursos = EspacioRecurso.objects.all()
            count = 0
            errors = 0
            
            for er in espacios_recursos:
                try:
                    item = {
                        'idrecurso': er.idrecurso.idrecurso,
                        'idespacio': er.idespacio.idespacio,
                    }
                    
                    if er.idestadorecurso:
                        item['idestadorecurso'] = er.idestadorecurso.idestadorecurso
                    
                    self.dynamo_client.espaciorecurso.table.put_item(Item=item)
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando espacio-recurso: {e}")
                    errors += 1
            
            self.log_migration('espaciorecurso', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error migrando espacios-recursos: {e}")
        
        # TipoActividadEspacio
        try:
            tipos_actividad_espacio = TipoActividadEspacio.objects.all()
            count = 0
            errors = 0
            
            for tae in tipos_actividad_espacio:
                try:
                    self.dynamo_client.zona.dynamodb.Table('tipoactividadespacio').put_item(Item={
                        'idtipoactividad': tae.idtipoactividad.idtipoactividad,
                        'idespacio': tae.idespacio.idespacio
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando tipo actividad-espacio: {e}")
                    errors += 1
            
            self.log_migration('tipoactividadespacio', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error migrando tipos actividad-espacio: {e}")
        
        # TipoActividadResponsable
        try:
            tipos_actividad_responsable = TipoActividadResponsable.objects.all()
            count = 0
            errors = 0
            
            for tar in tipos_actividad_responsable:
                try:
                    self.dynamo_client.zona.dynamodb.Table('tipoactividadresponsable').put_item(Item={
                        'idtipoactividad': tar.idtipoactividad.idtipoactividad,
                        'rutresponsable': tar.rutresponsable.rutresponsable
                    })
                    count += 1
                except Exception as e:
                    print(f"   ❌ Error migrando tipo actividad-responsable: {e}")
                    errors += 1
            
            self.log_migration('tipoactividadresponsable', 'migradas', count, errors)
            
        except Exception as e:
            print(f"❌ Error migrando tipos actividad-responsable: {e}")
    
    def migrate_all_data(self):
        """Ejecuta migración completa de todos los datos"""
        print("🚀 Iniciando migración completa de datos SQLite → DynamoDB")
        print("=" * 70)
        
        # Orden de migración (respetando dependencias)
        migration_steps = [
            self.migrate_zonas,
            self.migrate_tipoactividad,
            self.migrate_estados,
            self.migrate_recursos,
            self.migrate_responsables,
            self.migrate_usuarios,
            self.migrate_espacios,
            self.migrate_tiporeserva,
            self.migrate_reservas,
            self.migrate_relaciones
        ]
        
        start_time = datetime.now()
        
        for step in migration_steps:
            try:
                step()
            except Exception as e:
                print(f"❌ Error ejecutando {step.__name__}: {e}")
        
        end_time = datetime.now()
        duration = end_time - start_time
        
        print("=" * 70)
        print(f"✅ Migración completada en {duration}")
        
        # Resumen
        total_records = sum([log['count'] for log in self.migration_log])
        total_errors = sum([log['errors'] for log in self.migration_log])
        
        print(f"📊 Resumen: {total_records} registros migrados, {total_errors} errores")
        
        # Guardar log de migración
        with open('migration_log.json', 'w') as f:
            json.dump(self.migration_log, f, indent=2)
        
        print("📝 Log detallado guardado en 'migration_log.json'")
    
    def verify_migration(self):
        """Verifica que la migración fue exitosa comparando conteos"""
        print("🔍 Verificando migración...")
        
        verifications = []
        
        # Verificar cada tabla
        tables_to_verify = [
            ('zona', Zona, self.dynamo_client.zona),
            ('usuario', Usuario, self.dynamo_client.usuario),
            ('responsable', Responsable, self.dynamo_client.responsable),
            ('espacio', Espacio, self.dynamo_client.espacio),
            ('reserva', Reserva, self.dynamo_client.reserva)
        ]
        
        for table_name, django_model, dynamo_manager in tables_to_verify:
            try:
                django_count = django_model.objects.count()
                dynamo_count = len(dynamo_manager.all())
                
                status = "✅" if django_count == dynamo_count else "❌"
                verifications.append({
                    'table': table_name,
                    'django_count': django_count,
                    'dynamo_count': dynamo_count,
                    'match': django_count == dynamo_count
                })
                
                print(f"{status} {table_name}: Django={django_count}, DynamoDB={dynamo_count}")
                
            except Exception as e:
                print(f"❌ Error verificando {table_name}: {e}")
        
        return verifications


def main():
    """Función principal de migración"""
    print("🔄 Migrador de Datos: SQLite → DynamoDB")
    print("=" * 50)
    
    # Inicializar migrador
    # Para DynamoDB local, descomenta la siguiente línea:
    # migrator = DataMigrator(endpoint_url='http://localhost:8000')
    migrator = DataMigrator()
    
    print("\nOpciones:")
    print("1. Migración completa")
    print("2. Solo verificar migración")
    print("3. Migrar tabla específica")
    
    try:
        # Ejecutar migración completa
        print("\n🚀 Ejecutando migración completa...")
        migrator.migrate_all_data()
        
        # Verificar resultados
        print("\n🔍 Verificando resultados...")
        migrator.verify_migration()
        
        print("\n✅ Proceso de migración completado!")
        
    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")


if __name__ == "__main__":
    main()
