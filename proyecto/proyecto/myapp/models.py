# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.IntegerField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.IntegerField()
    is_active = models.IntegerField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)



class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class Zona(models.Model):
    idzona = models.AutoField(db_column='idZona', primary_key=True)  # Field name made lowercase.
    nombrezona = models.CharField(db_column='nombreZona', max_length=60, blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'zona'

class TipoActividad(models.Model):
    idtipoactividad = models.AutoField(db_column='idTipoActividad', primary_key=True)  # Field name made lowercase.
    nombretipoactividad = models.CharField(db_column='nombreTipoActividad', max_length=50)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'tipoactividad'


class Estado(models.Model):
    idestado = models.AutoField(db_column='idEstado', primary_key=True)  # Field name made lowercase.
    descripcionestado = models.TextField(db_column='descripcionEstado', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'estado'


class EstadoEspacio(models.Model):
    idestadoespacio = models.AutoField(db_column='idEstadoEspacio', primary_key=True)  # Field name made lowercase.
    descripcionestadoespacio = models.TextField(db_column='descripcionEstadoEspacio', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'estadoespacio'


class EstadoRecurso(models.Model):
    idestadorecurso = models.AutoField(db_column='idEstadoRecurso', primary_key=True)  # Field name made lowercase.
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'estadorecurso'


class Recurso(models.Model):
    idrecurso = models.AutoField(db_column='idRecurso', primary_key=True)  # Field name made lowercase.
    nombrerecurso = models.CharField(db_column='nombreRecurso', max_length=60, blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'recurso'


class Responsable(models.Model):
    rutresponsable = models.CharField(db_column='rutResponsable', primary_key=True, max_length=11)  # Field name made lowercase.
    idtipoactividad = models.ForeignKey(TipoActividad, models.DO_NOTHING, db_column='idTipoActividad', blank=True, null=True)  # Field name made lowercase.
    nombreresponsable = models.CharField(db_column='nombreResponsable', max_length=60, blank=True, null=True)  # Field name made lowercase.
    apellidoresponsable = models.CharField(db_column='apellidoResponsable', max_length=60, blank=True, null=True)  # Field name made lowercase.
    fechanacimientoresponsable = models.DateField(db_column='fechaNacimientoResponsable', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'responsable'

class TipoActividadResponsable(models.Model):
    idtipoactividad = models.ForeignKey('TipoActividad', models.DO_NOTHING, db_column='idTipoActividad')
    rutresponsable = models.ForeignKey('Responsable', models.DO_NOTHING, db_column='rutResponsable', related_name='tipos_actividad_responsable')

    class Meta:
        managed = False
        db_table = 'tipoactividadresponsable'
        unique_together = (('idtipoactividad', 'rutresponsable'),)


class Usuario(models.Model):
    rutusuario = models.CharField(db_column='rutUsuario', primary_key=True, max_length=11)  # Field name made lowercase.
    nombreusuario = models.CharField(db_column='nombreUsuario', max_length=60, blank=True, null=True)  # Field name made lowercase.
    apellidousuario = models.CharField(db_column='apellidoUsuario', max_length=60, blank=True, null=True)  # Field name made lowercase.
    fechanacimientousuario = models.DateField(db_column='fechaNacimientoUsuario', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'usuario'

class Espacio(models.Model):
    idespacio = models.AutoField(db_column='idEspacio', primary_key=True)  # Field name made lowercase.
    idzona = models.ForeignKey('Zona', models.DO_NOTHING, db_column='idZona', blank=True, null=True)  # Field name made lowercase.
    numeroespacio = models.IntegerField(db_column='numeroEspacio', blank=True, null=True)  # Field name made lowercase.
    idestadoespacio = models.ForeignKey('EstadoEspacio', models.DO_NOTHING, db_column='idEstadoEspacio', blank=True, null=True)  # Field name made lowercase.
    tipoactividadespacio = models.CharField(db_column='tipoActividadEspacio', max_length=100, blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'espacio'

class TipoActividadEspacio(models.Model):
    idtipoactividad = models.ForeignKey('TipoActividad', models.DO_NOTHING, db_column='idTipoActividad')
    idespacio = models.ForeignKey('Espacio', models.DO_NOTHING, db_column='idEspacio', related_name='tipos_actividad_asociadas')

    class Meta:
        managed = False
        db_table = 'tipoactividadespacio'
        unique_together = (('idtipoactividad', 'idespacio'),)



class EspacioRecurso(models.Model):
    idrecurso = models.ForeignKey('Recurso', models.DO_NOTHING, db_column='idRecurso')  # Field name made lowercase.
    idespacio = models.ForeignKey(Espacio, models.DO_NOTHING, db_column='idEspacio')  # Field name made lowercase.
    idestadorecurso = models.ForeignKey('EstadoRecurso', models.DO_NOTHING, db_column='idEstadoRecurso', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'espaciorecurso'
        unique_together = (('idrecurso', 'idespacio'),)

    def cambiar_estado(self, nuevo_estado):
        estado_anterior = self.idestadorecurso_id
        self.idestadorecurso_id = nuevo_estado
        self.save()
        
        from .observers import NotificadorCambioEstado
        NotificadorCambioEstado().notificar(
            self.idrecurso,
            estado_anterior,
            nuevo_estado
        )
        return True

    def marcar_no_disponible(self):
        return self.cambiar_estado(3)
    
class TipoReserva(models.Model):
    idtiporeserva = models.AutoField(db_column='idTipoReserva', primary_key=True)
    tiporeserva = models.TextField(db_column='tipoReserva', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tiporeserva'

class Reserva(models.Model):
    idreserva = models.AutoField(db_column='idReserva', primary_key=True)  # Field name made lowercase.
    idespacio = models.ForeignKey(Espacio, models.DO_NOTHING, db_column='idEspacio', blank=True, null=True)  # Field name made lowercase.
    rutusuario = models.ForeignKey('Usuario', models.DO_NOTHING, db_column='rutUsuario', blank=True, null=True)  # Field name made lowercase.
    rutresponsable = models.ForeignKey('Responsable', models.DO_NOTHING, db_column='rutResponsable', blank=True, null=True)  # Field name made lowercase.
    idestado = models.ForeignKey('Estado', models.DO_NOTHING, db_column='idEstado', blank=True, null=True)  # Field name made lowercase.
    fechareserva = models.DateField(db_column='fechaReserva', blank=True, null=True)  # Field name made lowercase.
    horainicio = models.TimeField(db_column='horaInicio', blank=True, null=True)  # Field name made lowercase.
    horafin = models.TimeField(db_column='horaFin', blank=True, null=True)  # Field name made lowercase.
    idtiporeserva = models.ForeignKey('TipoReserva', models.DO_NOTHING, db_column='idTipoReserva', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'reserva'