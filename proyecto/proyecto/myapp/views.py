from django.shortcuts import render
from django.http import HttpResponse 
from .models import Pasillo, Box, Estadobox, Medico, Especialidad, Boximplemento, Consulta, Paciente, Implemento, TipoCita
from django.db import connection
from django.db.models import Count, Q, Value, CharField, Case, When, IntegerField
from django.db.models.functions import Concat
from django.db.models import Prefetch, Exists, OuterRef
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.utils import timezone
from datetime import date, timedelta, time, datetime
import pytz
from openpyxl import Workbook
import openpyxl
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.decorators import login_required
import jwt
from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone
from django.contrib.auth import login as auth_login
import pandas as pd



def token_required(view_func):
    def wrapper(request, *args, **kwargs):
        token = request.session.get("access_token")
        if not token:
            return redirect("/login")

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            exp = timezone.datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            if timezone.now() > exp:
                return redirect("/login")
        except jwt.ExpiredSignatureError:
            return redirect("/login")
        except jwt.InvalidTokenError:
            return redirect("/login")

        return view_func(request, *args, **kwargs)
    return wrapper


def disponibilidad_boxes(request):
    tz = pytz.timezone('America/Santiago')
    now = timezone.now().astimezone(tz)
    current_date = now.date()
    current_time = now.time()

    pasillos = Pasillo.objects.prefetch_related(
        Prefetch('box_set', 
                 queryset=Box.objects.annotate(
                     tiene_consulta_activa=Exists(
                         Consulta.objects.filter(
                             idbox=OuterRef('pk'),
                             fechaconsulta=current_date,
                             horainicio__lte=current_time,
                             horafin__gte=current_time
                         )
                     )
                 ).select_related('idestadobox')
        )
    ).all()

    total_disponibles = 0
    pasillos_data = []

    for pasillo in pasillos:
        boxes_data = []
        disponibles = 0
        
        for box in pasillo.box_set.all():
            if box.idestadobox.descripcionestadobox == "En mantención":
                estado = "mantencion"
            else:
                if hasattr(box, 'tiene_consulta_activa') and box.tiene_consulta_activa:
                    estado = "ocupado"
                else:
                    estado = "disponible"
                    disponibles += 1
            
            boxes_data.append({
                'box': box,
                'estado': estado
            })

        total_disponibles += disponibles

        pasillos_data.append({
            'pasillo': pasillo,
            'boxes_data': boxes_data,
            'disponibles': disponibles
        })

    return render(request, 'boxes.html', {
        'pasillos_data': pasillos_data,
        'total_disponibles': total_disponibles
    })


def disponibilidad(request):
    pasillos = Pasillo.objects.prefetch_related('box_set__idestadobox').all()
    return render(request, 'boxes.html', {'pasillos': pasillos})

@login_required(login_url='/login')
def personal(request):
    busqueda = request.GET.get('busqueda', '')
    especialidad_id = request.GET.get('especialidad', '')
    
    medicos = Medico.objects.select_related('idespecialidad').all().order_by('apellidomedico')
    
    if busqueda:
        medicos = medicos.filter(
            Q(nombremedico__icontains=busqueda) | 
            Q(apellidomedico__icontains=busqueda)
        )
    
    if especialidad_id:
        medicos = medicos.filter(idespecialidad__idespecialidad=especialidad_id)
        especialidad_nombre = Especialidad.objects.get(
            idespecialidad=especialidad_id
        ).nombreespecialidad
    else:
        especialidad_nombre = None
    
    especialidades = Especialidad.objects.filter(
        idespecialidad__in=Medico.objects.values('idespecialidad').distinct()
    ).order_by('nombreespecialidad')
    
    return render(request, 'personal.html', {
        'medicos': medicos,
        'especialidades': especialidades,
        'busqueda_actual': busqueda,
        'especialidad_actual': especialidad_id,
        'especialidad_nombre': especialidad_nombre
    })

def cambiar_estado_implemento(request, implemento_id, box_id, nuevo_estado):
    try:
        box_implemento = get_object_or_404(
            Boximplemento,
            idimplemento=implemento_id,
            idbox=box_id
        )
        
        if box_implemento.cambiar_estado(nuevo_estado):
            messages.success(request, "Estado del implemento actualizado")
        else:
            messages.error(request, "No se pudo cambiar el estado")
            
    except Exception as e:
        messages.error(request, f"Error: {str(e)}")
    
    return redirect('Implementos.html')

@login_required(login_url='/login')
def agenda(request):
    ahora_local = timezone.localtime(timezone.now())
    fecha_hoy = ahora_local.date()
    hora_actual = ahora_local.time()
    boxes = Box.objects.all()
    tipos_cita = TipoCita.objects.all()
    
    mostrar_actuales = 'mostrar_actuales' in request.GET
    
    filtro_medico = request.GET.get('medico', '')
    filtro_paciente = request.GET.get('paciente', '')
    filtro_box = request.GET.get('box', '')
    filtro_tipo_cita = request.GET.get('tipo_cita', '')
    
    if mostrar_actuales:
        fecha_seleccionada = fecha_hoy
    else:
        try:
            fecha_seleccionada = date.fromisoformat(request.GET.get('fecha', fecha_hoy.isoformat()))
        except ValueError:
            fecha_seleccionada = fecha_hoy
    
    consultas = Consulta.objects.select_related(
        'rutmedico', 'rutpaciente', 'idbox', 'idtipocita'
    ).filter(
        fechaconsulta=fecha_seleccionada
    ).order_by('horainicio')
    
    if filtro_medico:
        consultas = consultas.filter(
            Q(rutmedico__nombremedico__icontains=filtro_medico) |
            Q(rutmedico__apellidomedico__icontains=filtro_medico)
        )
    
    if filtro_paciente:
        consultas = consultas.filter(
            Q(rutpaciente__nombrepaciente__icontains=filtro_paciente) |
            Q(rutpaciente__apellidopaciente__icontains=filtro_paciente)
        )
    
    if filtro_box:
        consultas = consultas.filter(idbox__idbox=filtro_box)
    
    if filtro_tipo_cita:
        consultas = consultas.filter(idtipocita__idtipocita=filtro_tipo_cita)
    
    if mostrar_actuales:
        consultas = consultas.filter(horainicio__gte=hora_actual)
    
    return render(request, 'agenda.html', {
        'consultas': consultas,
        'fecha_seleccionada': fecha_seleccionada,
        'hoy': fecha_hoy,
        'hora_actual': hora_actual,
        'mostrar_actuales': mostrar_actuales,
        'boxes': boxes,
        'tipos_cita': tipos_cita
    })

@login_required(login_url='/login')
def box_detail(request, box_id):
    ahora_local = timezone.localtime(timezone.now())
    fecha_hoy = ahora_local.date()
    hora_actual = ahora_local.time()

    box = get_object_or_404(Box, idbox=box_id)

    especialidad = box.especialidadbox
    implementos = Implemento.objects.filter(
        boximplemento__idbox=box.idbox
    ).values_list('nombreimplemento', flat=True)
    estado = box.idestadobox.descripcionestadobox

    tipos_cita = TipoCita.objects.all()

    mostrar_actuales = 'mostrar_actuales' in request.GET

    filtro_medico = request.GET.get('medico', '')
    filtro_paciente = request.GET.get('paciente', '')
    filtro_tipo_cita = request.GET.get('tipo_cita', '')

    if mostrar_actuales:
        fecha_seleccionada = fecha_hoy
    else:
        try:
            fecha_seleccionada = date.fromisoformat(request.GET.get('fecha', fecha_hoy.isoformat()))
        except ValueError:
            fecha_seleccionada = fecha_hoy

    consultas = Consulta.objects.select_related(
        'rutmedico', 'rutpaciente', 'idbox', 'idtipocita'
    ).filter(
        fechaconsulta=fecha_seleccionada,
        idbox=box
    ).order_by('horainicio')

    if filtro_medico:
        consultas = consultas.filter(
            Q(rutmedico__nombremedico__icontains=filtro_medico) |
            Q(rutmedico__apellidomedico__icontains=filtro_medico)
        )

    if filtro_paciente:
        consultas = consultas.filter(
            Q(rutpaciente__nombrepaciente__icontains=filtro_paciente) |
            Q(rutpaciente__apellidopaciente__icontains=filtro_paciente)
        )

    if filtro_tipo_cita:
        consultas = consultas.filter(idtipocita__idtipocita=filtro_tipo_cita)

    if mostrar_actuales:
        consultas = consultas.filter(horainicio__gte=hora_actual)

    return render(request, 'box.html', {
        'consultas': consultas,
        'fecha_seleccionada': fecha_seleccionada,
        'hoy': fecha_hoy,
        'hora_actual': hora_actual,
        'mostrar_actuales': mostrar_actuales,
        'box': box,
        'box_id': box.idbox,
        'n_box': box.numerobox,
        'especialidad': especialidad,
        'implementos': implementos,
        'estado': estado,
        'tipos_cita': tipos_cita
    })

@login_required(login_url='/login')
def implementos(request):
    implementos_data = Boximplemento.objects.values(
        'idimplemento',
        'idimplemento__nombreimplemento'
    ).annotate(
        total=Count('idimplemento'),
        disponible=Count(
            Case(
                When(idestadoimplemento__descripcion='Disponible', then=1),
                output_field=IntegerField()
            )
        ),
        reparacion=Count(
            Case(
                When(idestadoimplemento__descripcion='En reparación', then=1),
                output_field=IntegerField()
            )
        ),
        fuera_servicio=Count(
            Case(
                When(idestadoimplemento__descripcion='Fuera de servicio', then=1),
                output_field=IntegerField()
            )
        )
    ).order_by('idimplemento__nombreimplemento')

    implementos_dict = {
        item['idimplemento']: {
            'nombre': item['idimplemento__nombreimplemento'],
            'total': item['total'],
            'disponible': item['disponible'],
            'reparacion': item['reparacion'],
            'fuera_servicio': item['fuera_servicio']
        }
        for item in implementos_data
    }

    context = {
        'implementos': implementos_dict,
        'total_implementos': len(implementos_dict)
    }
    
    return render(request, 'implementos.html', context)

def login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)

        if user is not None:
            auth_login(request, user)
            request.session["access_token"] = "aquí_va_tu_token"
            return redirect("/panel")
        else:
            return render(request, "login.html", {"error": "Usuario o contraseña incorrectos"})
    return render(request, "login.html")

@login_required(login_url='/login')
def boxes(request):
    return render(request, 'boxes.html')

@login_required(login_url='/login')
def panel_admin(request):
    return render(request, 'panel_admin.html')

@login_required(login_url='/login')
def dashboard(request):
    hoy = date.today()
    ahora = datetime.now().time()
    
    total_boxes = Box.objects.count()
    
    en_mantencion = Box.objects.filter(idestadobox__descripcionestadobox="En mantención").count()
    
    boxes_en_uso_ids = Consulta.objects.filter(
        fechaconsulta=hoy,
        horainicio__lte=ahora,
        horafin__gte=ahora
    ).values_list('idbox', flat=True).distinct()
    
    boxes_en_uso = boxes_en_uso_ids.count()
    
    boxes_en_uso_y_mantencion = Box.objects.filter(
        idbox__in=boxes_en_uso_ids,
        idestadobox__descripcionestadobox="En mantención"
    ).count()
    
    boxes_realmente_disponibles = total_boxes - boxes_en_uso - en_mantencion + boxes_en_uso_y_mantencion
    
    disponibles = max(0, boxes_realmente_disponibles)
    
    en_mantencion = max(0, en_mantencion - boxes_en_uso_y_mantencion)
    
    porcentajes = {
        'en_uso': round((boxes_en_uso / total_boxes * 100), 1) if total_boxes > 0 else 0,
        'disponibles': round((disponibles / total_boxes * 100), 1) if total_boxes > 0 else 0,
        'en_mantencion': round((en_mantencion / total_boxes * 100), 1) if total_boxes > 0 else 0,
    }

    horas = ['08:00','08:20','08:40','09:00','09:20','09:40','10:00','10:20','10:40', 
             '11:00', '11:20', '11:40', '12:00','12:20','12:40','13:00', '13:20', '13:40', '14:00','14:20', '14:40', 
             '15:00','15:20','15:40','16:00', '16:20', '16:40', '17:00','17:20','17:40']
    ocupados_por_hora = []
    
    for hora_str in horas:
        hora = datetime.strptime(hora_str, '%H:%M').time()
        boxes_en_uso_hora = Consulta.objects.filter(
            fechaconsulta=hoy,
            horainicio__lte=hora,
            horafin__gte=hora
        ).values_list('idbox', flat=True).distinct().count()
        ocupados_por_hora.append(boxes_en_uso_hora)

    especialidades_demandadas = Consulta.objects.filter(fechaconsulta=hoy).values(
        'rutmedico__idespecialidad__nombreespecialidad'
    ).annotate(
        total=Count('idconsulta')
    ).order_by('-total')[:5]

    labels_especialidades = [e['rutmedico__idespecialidad__nombreespecialidad'] for e in especialidades_demandadas]
    data_especialidades = [e['total'] for e in especialidades_demandadas]

    context = {
        'total_boxes': total_boxes,
        'en_uso': boxes_en_uso,
        'disponibles': disponibles,
        'en_mantencion': en_mantencion,
        'porcentajes': porcentajes,
        'horas': json.dumps(horas),
        'ocupados_por_hora': json.dumps(ocupados_por_hora),
        'labels_especialidades': json.dumps(labels_especialidades),
        'data_especialidades': json.dumps(data_especialidades),
    }
    return render(request, 'dashboard.html', context)

@login_required(login_url='/login')
def box(request):
    return render(request, 'box.html')

def exportar_excel_box(request, idbox):
    fecha_str = request.GET.get('fecha')
    try:
        fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        fecha = date.today()

    consultas = Consulta.objects.filter(
        idbox=idbox,
        fechaconsulta=fecha
    ).select_related('rutmedico', 'rutpaciente', 'idbox', 'idtipocita')

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Turnos Box"
    
    ws.append(['Box', 'Médico', 'Paciente', 'Fecha', 'Hora', 'Tipo de Cita'])
    
    for consulta in consultas:
        medico = ""
        if consulta.rutmedico:
            nombre_medico = getattr(consulta.rutmedico, "nombremedico", "") or getattr(consulta.rutmedico, "nombre", "")
            apellido_medico = getattr(consulta.rutmedico, "apellidomedico", "") or getattr(consulta.rutmedico, "apellido", "")
            medico = f"{nombre_medico} {apellido_medico}".strip()

        paciente = ""
        if consulta.rutpaciente:
            nombre_paciente = getattr(consulta.rutpaciente, "nombrepaciente", "") or getattr(consulta.rutpaciente, "nombre", "")
            apellido_paciente = getattr(consulta.rutpaciente, "apellidopaciente", "") or getattr(consulta.rutpaciente, "apellido", "")
            paciente = f"{nombre_paciente} {apellido_paciente}".strip()

        tipo_cita = getattr(consulta.idtipocita, "tipocita", "")

        ws.append([
            f"Box {consulta.idbox.numerobox if hasattr(consulta.idbox, 'numerobox') else consulta.idbox_id}",
            medico,
            paciente,
            consulta.fechaconsulta.strftime('%Y-%m-%d'),
            consulta.horainicio.strftime('%H:%M'),
            tipo_cita,
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    filename = f"box_{idbox}_turnos_{fecha}.xlsx"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    wb.save(response)
    return response

def homepage(request):
    return render(request, 'homepage.html')

def agendar_no_medica(request):
    if request.method == "POST":
        try:
            fecha = request.POST.get("fechaConsulta")
            hora_inicio = request.POST.get("horaInicio")
            hora_fin = request.POST.get("horaFin")
            box_id = request.POST.get("box")
            tipo_cita_id = 2

            if not (fecha and hora_inicio and hora_fin and box_id):
                return JsonResponse({"mensaje": "Faltan datos para agendar"}, status=400)

            choque = Consulta.objects.filter(
                idbox=box_id,
                fechaconsulta=fecha
            ).filter(
                Q(horainicio__lt=hora_fin) & Q(horafin__gt=hora_inicio)
            ).exists()

            if choque:
                return JsonResponse({"mensaje": "El box tiene una cita agendada en este horario"}, status=400)

            box = Box.objects.get(pk=box_id)
            tipo_cita = TipoCita.objects.get(pk=tipo_cita_id)

            Consulta.objects.create(
                idbox=box,
                fechaconsulta=fecha,
                horainicio=hora_inicio,
                horafin=hora_fin,
                idtipocita=tipo_cita
            )

            return JsonResponse({"mensaje": "La cita ha sido agendada correctamente"})

        except Exception as e:
            return JsonResponse({"mensaje": f"Error: {str(e)}"}, status=400)
            
def agendar_no_medica_box(request, box_id):
    if request.method == "POST":
        try:
            fecha = request.POST.get("fechaConsulta")
            hora_inicio = request.POST.get("horaInicio")
            hora_fin = request.POST.get("horaFin")
            tipo_cita_id = 2

            if not (fecha and hora_inicio and hora_fin):
                return JsonResponse({"mensaje": "Faltan datos para agendar"}, status=400)

            choque = Consulta.objects.filter(
                idbox=box_id,
                fechaconsulta=fecha
            ).filter(
                Q(horainicio__lt=hora_fin) & Q(horafin__gt=hora_inicio)
            ).exists()

            if (choque):
                return JsonResponse({"mensaje": "El box tiene una cita agendada en este horario"}, status=400)

            box = Box.objects.get(pk=box_id)
            tipo_cita = TipoCita.objects.get(pk=tipo_cita_id)

            Consulta.objects.create(
                idbox=box,
                fechaconsulta=fecha,
                horainicio=hora_inicio,
                horafin=hora_fin,
                idtipocita=tipo_cita
            )

            return JsonResponse({"mensaje": "La cita ha sido agendada correctamente"})
        except Exception as e:
            return JsonResponse({"mensaje": f"Error: {str(e)}"}, status=400)


def reporte_por_dia(request):
    if request.method == 'POST':
        accion = request.POST.get('accion')

        if accion == 'descargar':
            fecha_str = request.POST.get('fecha')
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()

            consultas = Consulta.objects.filter(fechaconsulta=fecha)

            wb = Workbook()
            ws = wb.active
            ws.title = f"Consultas {fecha_str}"

            ws.append(['ID', 'Paciente', 'Médico', 'Box', 'Hora Inicio', 'Hora Fin', 'Tipo de cita'])

            for consulta in consultas:
                paciente = (
                    f"{consulta.rutpaciente.nombrepaciente} {consulta.rutpaciente.apellidopaciente}"
                    if consulta.rutpaciente else "Sin paciente"
                )
                medico = (
                    f"{consulta.rutmedico.nombremedico} {consulta.rutmedico.apellidomedico}"
                    if consulta.rutmedico else "Sin médico"
                )
                box = consulta.idbox.numerobox if consulta.idbox else "Sin box"
                hora_inicio = str(consulta.horainicio) if consulta.horainicio else ""
                hora_fin = str(consulta.horafin) if consulta.horafin else ""
                tipo_cita = consulta.idtipocita.tipocita if consulta.idtipocita else "Sin tipo"

                ws.append([
                    consulta.idconsulta,
                    paciente,
                    medico,
                    box,
                    hora_inicio,
                    hora_fin,
                    tipo_cita
                ])

            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            filename = f'reporte_{fecha_str}.xlsx'
            response['Content-Disposition'] = f'attachment; filename={filename}'
            wb.save(response)

            return response

        elif accion == 'importar' and request.FILES.get('archivo'):
            archivo = request.FILES['archivo']

            try:
                if archivo.name.endswith('.csv'):
                    df = pd.read_csv(archivo)
                else:
                    df = pd.read_excel(archivo)
            except Exception as e:
                messages.error(request, f"Error al leer el archivo: {e}")
                return redirect('reporte_por_dia')

            errores = []
            for i, row in df.iterrows():
                fecha = row['fecha']
                hora_inicio = row['horaInicio']
                hora_fin = row['horaFin']
                box_id = row['idBox']

                choques = Consulta.objects.filter(
                    idbox_id=box_id,
                    fechaconsulta=fecha,
                    horainicio__lt=hora_fin,
                    horafin__gt=hora_inicio
                )

                if choques.exists():
                    errores.append(f"Fila {i+2}: Conflicto en Box {box_id} entre {hora_inicio}-{hora_fin}")
                else:
                    Consulta.objects.create(
                        idbox_id=box_id,
                        rutpaciente_id=row['rutPaciente'],
                        rutmedico_id=row['rutMedico'],
                        fechaconsulta=fecha,
                        horainicio=hora_inicio,
                        horafin=hora_fin,
                        idtipocita_id=row.get('idTipoCita')
                    )

            if errores:
                for err in errores:
                    messages.error(request, err)
            else:
                messages.success(request, "Horario importado correctamente.")

            return redirect('reportes')

    return render(request, 'reportes.html')

def ajax_reporte_preview(request):
    fecha_str = request.GET.get('fecha')
    try:
        fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return JsonResponse({'columns': [], 'rows': []})

    consultas = Consulta.objects.filter(fechaconsulta=fecha)

    columns = ['ID', 'Paciente', 'Médico', 'Box', 'Hora Inicio', 'Hora Fin', 'Tipo de cita']
    rows = []

    for consulta in consultas:
        paciente = f"{consulta.rutpaciente.nombrepaciente} {consulta.rutpaciente.apellidopaciente}" if consulta.rutpaciente else "Sin paciente"
        medico = f"{consulta.rutmedico.nombremedico} {consulta.rutmedico.apellidomedico}" if consulta.rutmedico else "Sin médico"
        box = consulta.idbox.numerobox if consulta.idbox else "Sin box"
        hora_inicio = str(consulta.horainicio) if consulta.horainicio else ""
        hora_fin = str(consulta.horafin) if consulta.horafin else ""
        tipo_cita = consulta.idtipocita.tipocita if consulta.idtipocita else "Sin tipo"

        rows.append([consulta.idconsulta, paciente, medico, box, hora_inicio, hora_fin, tipo_cita])

    return JsonResponse({'columns': columns, 'rows': rows})


def ajax_importar_preview(request):
    if request.method == 'POST' and request.FILES.get('archivo'):
        archivo = request.FILES['archivo']
        try:
            if archivo.name.endswith('.csv'):
                df = pd.read_csv(archivo)
            else:
                df = pd.read_excel(archivo)
        except:
            return JsonResponse({'columns': [], 'rows': []})

        columns = list(df.columns)
        rows = df.head(10).values.tolist()
        return JsonResponse({'columns': columns, 'rows': rows})
    return JsonResponse({'columns': [], 'rows': []})