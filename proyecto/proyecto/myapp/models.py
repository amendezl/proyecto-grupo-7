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


class Pasillo(models.Model):
    idpasillo = models.AutoField(db_column='idPasillo', primary_key=True)  # Field name made lowercase.
    nombrepasillo = models.CharField(db_column='nombrePasillo', max_length=60, blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'pasillo'

class Especialidad(models.Model):
    idespecialidad = models.AutoField(db_column='idEspecialidad', primary_key=True)  # Field name made lowercase.
    nombreespecialidad = models.CharField(db_column='nombreEspecialidad', max_length=20)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'especialidad'


class Estado(models.Model):
    idestado = models.AutoField(db_column='idEstado', primary_key=True)  # Field name made lowercase.
    descripcionestado = models.TextField(db_column='descripcionEstado', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'estado'


class Estadobox(models.Model):
    idestadobox = models.AutoField(db_column='idEstadoBox', primary_key=True)  # Field name made lowercase.
    descripcionestadobox = models.TextField(db_column='descripcionEstadoBox', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'estadobox'


class Estadoimplemento(models.Model):
    idestadoimplemento = models.AutoField(db_column='idEstadoImplemento', primary_key=True)  # Field name made lowercase.
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'estadoimplemento'


class Implemento(models.Model):
    idimplemento = models.AutoField(db_column='idImplemento', primary_key=True)  # Field name made lowercase.
    nombreimplemento = models.CharField(db_column='nombreImplemento', max_length=60, blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'implemento'


class Medico(models.Model):
    rutmedico = models.CharField(db_column='rutMedico', primary_key=True, max_length=11)  # Field name made lowercase.
    idespecialidad = models.ForeignKey(Especialidad, models.DO_NOTHING, db_column='idEspecialidad', blank=True, null=True)  # Field name made lowercase.
    nombremedico = models.CharField(db_column='nombreMedico', max_length=60, blank=True, null=True)  # Field name made lowercase.
    apellidomedico = models.CharField(db_column='apellidoMedico', max_length=60, blank=True, null=True)  # Field name made lowercase.
    fechanacimientomedico = models.DateField(db_column='fechaNacimientoMedico', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'medico'

class Especialidadmedico(models.Model):
    idespecialidad = models.ForeignKey('Especialidad', models.DO_NOTHING, db_column='idEspecialidad')
    rutmedico = models.ForeignKey('Medico', models.DO_NOTHING, db_column='rutMedico', related_name='especialidades_medico')

    class Meta:
        managed = False
        db_table = 'especialidadmedico'
        unique_together = (('idespecialidad', 'rutmedico'),)


class Paciente(models.Model):
    rutpaciente = models.CharField(db_column='rutPaciente', primary_key=True, max_length=11)  # Field name made lowercase.
    nombrepaciente = models.CharField(db_column='nombrePaciente', max_length=60, blank=True, null=True)  # Field name made lowercase.
    apellidopaciente = models.CharField(db_column='apellidoPaciente', max_length=60, blank=True, null=True)  # Field name made lowercase.
    fechanacimientopaciente = models.DateField(db_column='fechaNacimientoPaciente', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'paciente'

class Box(models.Model):
    idbox = models.AutoField(db_column='idBox', primary_key=True)  # Field name made lowercase.
    idpasillo = models.ForeignKey('Pasillo', models.DO_NOTHING, db_column='idPasillo', blank=True, null=True)  # Field name made lowercase.
    numerobox = models.IntegerField(db_column='numeroBox', blank=True, null=True)  # Field name made lowercase.
    idestadobox = models.ForeignKey('Estadobox', models.DO_NOTHING, db_column='idEstadoBox', blank=True, null=True)  # Field name made lowercase.
    especialidadbox = models.CharField(db_column='especialidadBox', max_length=100, blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'box'

class Especialidadbox(models.Model):
    idespecialidad = models.ForeignKey('Especialidad', models.DO_NOTHING, db_column='idEspecialidad')
    idbox = models.ForeignKey('Box', models.DO_NOTHING, db_column='idBox', related_name='especialidades_asociadas')

    class Meta:
        managed = False
        db_table = 'especialidadbox'
        unique_together = (('idespecialidad', 'idbox'),)



class Boximplemento(models.Model):
    idimplemento = models.ForeignKey('Implemento', models.DO_NOTHING, db_column='idImplemento')  # Field name made lowercase.
    idbox = models.ForeignKey(Box, models.DO_NOTHING, db_column='idBox')  # Field name made lowercase.
    idestadoimplemento = models.ForeignKey('Estadoimplemento', models.DO_NOTHING, db_column='idEstadoImplemento', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'boximplemento'
        unique_together = (('idimplemento', 'idbox'),)

    def cambiar_estado(self, nuevo_estado):
        estado_anterior = self.idestadoimplemento_id
        self.idestadoimplemento_id = nuevo_estado
        self.save()
        
        from .observers import NotificadorCambioEstado
        NotificadorCambioEstado().notificar(
            self.idimplemento,
            estado_anterior,
            nuevo_estado
        )
        return True

    def marcar_no_disponible(self):
        return self.cambiar_estado(3)
    
class TipoCita(models.Model):
    idtipocita = models.AutoField(db_column='idTipoCita', primary_key=True)
    tipocita = models.TextField(db_column='tipoCita', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tipocita'

class Consulta(models.Model):
    idconsulta = models.AutoField(db_column='idConsulta', primary_key=True)  # Field name made lowercase.
    idbox = models.ForeignKey(Box, models.DO_NOTHING, db_column='idBox', blank=True, null=True)  # Field name made lowercase.
    rutpaciente = models.ForeignKey('Paciente', models.DO_NOTHING, db_column='rutPaciente', blank=True, null=True)  # Field name made lowercase.
    rutmedico = models.ForeignKey('Medico', models.DO_NOTHING, db_column='rutMedico', blank=True, null=True)  # Field name made lowercase.
    idestado = models.ForeignKey('Estado', models.DO_NOTHING, db_column='idEstado', blank=True, null=True)  # Field name made lowercase.
    fechaconsulta = models.DateField(db_column='fechaConsulta', blank=True, null=True)  # Field name made lowercase.
    horainicio = models.TimeField(db_column='horaInicio', blank=True, null=True)  # Field name made lowercase.
    horafin = models.TimeField(db_column='horaFin', blank=True, null=True)  # Field name made lowercase.
    idtipocita = models.ForeignKey('TipoCita', models.DO_NOTHING, db_column='idTipoCita', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'consulta'