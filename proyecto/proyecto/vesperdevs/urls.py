"""
URL configuration for vesperdevs project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from myapp import views 
from rest_framework_simplejwt.views import (TokenObtainPairView, TokenRefreshView,)
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', views.homepage, name='homepage'),
    path('login/', views.login, name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('boxes/', views.disponibilidad_boxes, name='boxes'),
    path('panel/', views.panel_admin, name='panel'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('personal/', views.personal, name='personal'),
    path('agenda/', views.agenda, name='agenda'),
    path('implementos/', views.implementos, name='implementos'),
    path('cambiar_estado/<int:implemento_id>/<int:box_id>/<int:nuevo_estado>/',views.cambiar_estado_implemento,name='cambiar_estado'),
    path('box/<int:box_id>/', views.box_detail, name='box_detail'),
    path('box/<int:idbox>/exportar_excel/', views.exportar_excel_box, name='exportar_excel_box'),
    path('reportes/', views.reporte_por_dia, name='reportes'),
    path('agendar-no-medica/', views.agendar_no_medica, name='agendar_no_medica'),
    path('boxes/<int:box_id>/agendar-no-medica/', views.agendar_no_medica_box, name='agendar_no_medica_box'),
    path('ajax/reporte_preview/', views.ajax_reporte_preview, name='ajax_reporte_preview'),
    path('ajax/importar_preview/', views.ajax_importar_preview, name='ajax_importar_preview'),
]