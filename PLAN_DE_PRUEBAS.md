# Plan de Pruebas - Sistema de Gestión de Espacios

**Fecha:** 9 de diciembre de 2025  
**Versión:** 1.0  
**Build ID:** QaEKt6yc-RKvBYw94cKic  
**Ambiente:** Producción (CloudFront + API Gateway + Lambda)

---

## 1. AUTENTICACIÓN Y AUTORIZACIÓN

### 1.1 Registro de Usuario
- [ ] **TC-001**: Registrar nuevo usuario con datos válidos
  - Email válido, contraseña segura, nombre y apellido
  - **Resultado esperado**: Usuario creado, redirección a onboarding
  
- [ ] **TC-002**: Intentar registro con email duplicado
  - Usar email ya existente
  - **Resultado esperado**: Error "El email ya está registrado"
  
- [ ] **TC-003**: Validación de contraseña débil
  - Contraseña < 8 caracteres
  - **Resultado esperado**: Error de validación

### 1.2 Inicio de Sesión
- [ ] **TC-004**: Login con credenciales válidas
  - Usuario registrado + contraseña correcta
  - **Resultado esperado**: Acceso al dashboard, token guardado
  
- [ ] **TC-005**: Login con credenciales inválidas
  - Email o contraseña incorrecta
  - **Resultado esperado**: Error "Credenciales inválidas"
  
- [ ] **TC-006**: Verificar persistencia de sesión
  - Login → Refrescar página → Verificar que sigue logueado
  - **Resultado esperado**: Sesión persistente

### 1.3 Permisos por Rol
- [ ] **TC-007**: Usuario con rol "admin"
  - Verificar acceso a: usuarios, espacios, zonas, responsables, reservas
  - **Resultado esperado**: Acceso total a todas las secciones
  
- [ ] **TC-008**: Usuario con rol "usuario"
  - Intentar acceder a secciones administrativas
  - **Resultado esperado**: Solo ver sus propias reservas y espacios disponibles

---

## 2. GESTIÓN DE ESPACIOS

### 2.1 Listar Espacios
- [ ] **TC-009**: Ver lista de espacios sin filtros
  - Navegar a /espacios
  - **Resultado esperado**: Tabla con todos los espacios, paginación funcional
  
- [ ] **TC-010**: Filtrar espacios por estado
  - Aplicar filtro "Disponible", "Ocupado", "Mantenimiento"
  - **Resultado esperado**: Solo espacios con ese estado

### 2.2 Crear Espacio
- [ ] **TC-011**: Crear espacio con datos válidos
  - Nombre, capacidad, zona, tipo, equipamiento
  - **Resultado esperado**: Espacio creado, aparece en la lista
  
- [ ] **TC-012**: Validación de campos obligatorios
  - Intentar crear sin nombre o capacidad
  - **Resultado esperado**: Errores de validación

### 2.3 Editar Espacio
- [ ] **TC-013**: Actualizar información de espacio existente
  - Cambiar nombre, capacidad, estado
  - **Resultado esperado**: Cambios guardados correctamente
  
- [ ] **TC-014**: Cambiar estado a "Mantenimiento"
  - **Resultado esperado**: Espacio no disponible para reservas

### 2.4 Eliminar Espacio
- [ ] **TC-015**: Eliminar espacio sin reservas activas
  - **Resultado esperado**: Espacio eliminado
  
- [ ] **TC-016**: Intentar eliminar espacio con reservas
  - **Resultado esperado**: Advertencia o error de conflicto

---

## 3. GESTIÓN DE RESERVAS

### 3.1 Crear Reserva
- [ ] **TC-017**: Crear reserva con datos válidos
  - Espacio disponible, fecha futura, horario válido
  - **Resultado esperado**: Reserva creada en estado "pendiente", aparece en la lista después de 2-3 segundos (eventual consistency)
  
- [ ] **TC-018**: Intentar reserva en fecha pasada
  - Seleccionar fecha/hora anterior a la actual
  - **Resultado esperado**: Error traducido "No se pueden crear reservas en el pasado"
  
- [ ] **TC-019**: Intentar reserva en horario ocupado
  - Crear reserva en horario que ya tiene otra reserva confirmada
  - **Resultado esperado**: Error traducido "El espacio ya está reservado en ese horario"
  
- [ ] **TC-020**: Validación de horario (fin > inicio)
  - Hora fin anterior a hora inicio
  - **Resultado esperado**: Error de validación

### 3.2 Visualizar Reservas
- [ ] **TC-021**: Ver lista de reservas (modo lista)
  - **Resultado esperado**: Tabla con todas las reservas de la empresa
  
- [ ] **TC-022**: Ver calendario de reservas
  - Cambiar a vista de calendario
  - **Resultado esperado**: Reservas organizadas por fecha en calendario
  
- [ ] **TC-023**: Filtrar por estado
  - Aplicar filtros: Pendiente, Confirmada, En curso, Completada, Cancelada
  - **Resultado esperado**: Solo reservas con ese estado
  
- [ ] **TC-024**: Filtrar por espacio
  - Seleccionar espacio específico
  - **Resultado esperado**: Solo reservas de ese espacio
  
- [ ] **TC-025**: Búsqueda por texto
  - Buscar por usuario, espacio o propósito
  - **Resultado esperado**: Resultados filtrados correctamente

### 3.3 Modificar Reserva
- [ ] **TC-026**: Cancelar reserva propia
  - **Resultado esperado**: Estado cambia a "cancelada"
  
- [ ] **TC-027**: Admin cambia estado de reserva
  - Pendiente → Confirmada
  - **Resultado esperado**: Estado actualizado

### 3.4 Estadísticas
- [ ] **TC-028**: Ver contadores por estado
  - **Resultado esperado**: Total, Confirmadas, Pendientes, Canceladas correctos

---

## 4. MULTITENANCY

### 4.1 Aislamiento de Datos
- [ ] **TC-029**: Usuario de Empresa A no ve datos de Empresa B
  - Crear usuario en empresa diferente
  - **Resultado esperado**: Cada empresa solo ve sus propios espacios y reservas
  
- [ ] **TC-030**: Conflictos de reserva solo dentro de la misma empresa
  - Empresa A y B pueden reservar el mismo espacio al mismo tiempo
  - **Resultado esperado**: No hay conflicto entre empresas

---

## 5. INTERNACIONALIZACIÓN (i18n)

### 5.1 Cambio de Idioma
- [ ] **TC-031**: Cambiar idioma a Inglés
  - **Resultado esperado**: Toda la UI en inglés
  
- [ ] **TC-032**: Cambiar idioma a Español
  - **Resultado esperado**: Toda la UI en español
  
- [ ] **TC-033**: Cambiar idioma a Japonés
  - **Resultado esperado**: Toda la UI en japonés (日本語)
  
- [ ] **TC-034**: Cambiar idioma a Coreano
  - **Resultado esperado**: Toda la UI en coreano (한국어)
  
- [ ] **TC-035**: Verificar otros 6 idiomas
  - Francés, Alemán, Italiano, Chino, Hindi, Portugués
  - **Resultado esperado**: Traducciones completas y correctas

### 5.2 Mensajes de Error Traducidos
- [ ] **TC-036**: Error de reserva en pasado (10 idiomas)
  - Intentar crear reserva en pasado en cada idioma
  - **Resultado esperado**: Mensaje de error en el idioma seleccionado
  
- [ ] **TC-037**: Error de conflicto de horario (10 idiomas)
  - Intentar reservar horario ocupado en cada idioma
  - **Resultado esperado**: "El espacio ya está reservado..." traducido

### 5.3 Editor de Temas
- [ ] **TC-038**: Acceder al editor de temas desde configuración
  - Click en botón "Theme Editor" en Settings
  - **Resultado esperado**: Redirección a /theme-editing
  
- [ ] **TC-039**: Verificar traducciones del editor en todos los idiomas
  - Cambiar idioma y verificar: título, descripciones, botones, secciones
  - **Resultado esperado**: 57 claves traducidas en 10 idiomas

---

## 6. TEMAS Y PERSONALIZACIÓN

### 6.1 Colores
- [ ] **TC-040**: Cambiar color primario
  - Seleccionar nuevo color → Guardar
  - **Resultado esperado**: Cambio reflejado en botones, enlaces, badges
  
- [ ] **TC-041**: Cambiar color de fondo
  - **Resultado esperado**: Fondo de página actualizado
  
- [ ] **TC-042**: Cambiar colores de texto
  - **Resultado esperado**: Texto actualizado en toda la aplicación

### 6.2 Tipografía
- [ ] **TC-043**: Cambiar familia de fuentes
  - Probar: Inter, Roboto, Open Sans, Lato, etc.
  - **Resultado esperado**: Fuente aplicada globalmente
  
- [ ] **TC-044**: Ajustar tamaños de fuente
  - Base, headings, small
  - **Resultado esperado**: Tamaños actualizados

### 6.3 Espaciado
- [ ] **TC-045**: Modificar spacing scale
  - **Resultado esperado**: Márgenes y padding actualizados

### 6.4 Modo Oscuro
- [ ] **TC-046**: Activar Dark Mode
  - **Resultado esperado**: Paleta oscura aplicada, contraste adecuado
  
- [ ] **TC-047**: Toggle entre Light/Dark
  - **Resultado esperado**: Transición suave sin parpadeos

### 6.5 Persistencia
- [ ] **TC-048**: Guardar tema personalizado
  - Cambiar colores → Guardar → Refrescar página
  - **Resultado esperado**: Tema persistido correctamente
  
- [ ] **TC-049**: Resetear a tema por defecto
  - **Resultado esperado**: Vuelta a colores originales

---

## 7. RESPONSIVE DESIGN

### 7.1 Desktop (> 1024px)
- [ ] **TC-050**: Navegación en desktop
  - **Resultado esperado**: Sidebar visible, layout multi-columna
  
- [ ] **TC-051**: Tablas en desktop
  - **Resultado esperado**: Todas las columnas visibles, scroll horizontal si necesario

### 7.2 Tablet (768px - 1024px)
- [ ] **TC-052**: Navegación en tablet
  - **Resultado esperado**: Sidebar colapsable, touch-friendly
  
- [ ] **TC-053**: Formularios en tablet
  - **Resultado esperado**: Inputs accesibles, teclado virtual sin overlap

### 7.3 Mobile (< 768px)
- [ ] **TC-054**: Navegación en móvil
  - **Resultado esperado**: Menú hamburguesa, navegación touch
  
- [ ] **TC-055**: Reservas en móvil
  - **Resultado esperado**: Formulario vertical, date/time pickers nativos
  
- [ ] **TC-056**: Lista vs Cards en móvil
  - **Resultado esperado**: Cards apiladas verticalmente

---

## 8. RESILIENCIA Y CAOS

### 8.1 Eventual Consistency
- [ ] **TC-057**: Crear reserva y verificar aparición
  - **Resultado esperado**: Reserva aparece después de 3 reintentos (máximo 2 segundos)
  
- [ ] **TC-058**: Logs de retry en consola
  - **Resultado esperado**: "Intento 1/2/3: X reservas encontradas"

### 8.2 Manejo de Errores
- [ ] **TC-059**: Backend no disponible (simular 500)
  - **Resultado esperado**: Mensaje de error amigable, no crash
  
- [ ] **TC-060**: Timeout de red
  - **Resultado esperado**: Retry automático, mensaje informativo
  
- [ ] **TC-061**: Sesión expirada
  - **Resultado esperado**: Redirección a login, mensaje "Sesión expirada"

---

## 9. PERFORMANCE

### 9.1 Tiempos de Carga
- [ ] **TC-062**: First Contentful Paint (FCP)
  - **Resultado esperado**: < 1.5 segundos
  
- [ ] **TC-063**: Largest Contentful Paint (LCP)
  - **Resultado esperado**: < 2.5 segundos
  
- [ ] **TC-064**: Time to Interactive (TTI)
  - **Resultado esperado**: < 3.5 segundos

### 9.2 Optimizaciones
- [ ] **TC-065**: Lazy loading de rutas
  - Navegar entre páginas
  - **Resultado esperado**: Solo cargar chunks necesarios
  
- [ ] **TC-066**: Caché de imágenes/assets
  - **Resultado esperado**: Assets servidos desde caché en segunda visita

---

## 10. SEGURIDAD

### 10.1 Autenticación
- [ ] **TC-067**: Token JWT en headers
  - **Resultado esperado**: Authorization header presente en todas las peticiones
  
- [ ] **TC-068**: Refresh token al expirar
  - **Resultado esperado**: Token renovado automáticamente

### 10.2 CORS
- [ ] **TC-069**: Peticiones desde dominio autorizado
  - **Resultado esperado**: Headers CORS correctos (Access-Control-Allow-Origin)

### 10.3 Validación
- [ ] **TC-070**: SQL Injection (campos de texto)
  - Intentar payloads maliciosos
  - **Resultado esperado**: Input sanitizado, validación backend
  
- [ ] **TC-071**: XSS en campos de texto
  - Intentar scripts en notas/propósito
  - **Resultado esperado**: HTML escapado

---

## 11. ACCESIBILIDAD (a11y)

### 11.1 Navegación por Teclado
- [ ] **TC-072**: Tab navigation
  - **Resultado esperado**: Orden lógico, focus visible
  
- [ ] **TC-073**: Enter/Space en botones
  - **Resultado esperado**: Acciones ejecutadas

### 11.2 Screen Readers
- [ ] **TC-074**: Atributos ARIA
  - **Resultado esperado**: aria-labels presentes en elementos interactivos
  
- [ ] **TC-075**: Alt text en imágenes
  - **Resultado esperado**: Todas las imágenes con alt descriptivo

### 11.3 Contraste
- [ ] **TC-076**: WCAG AA compliance
  - **Resultado esperado**: Ratio de contraste > 4.5:1 para texto normal

---

## 12. INTEGRACIÓN CONTINUA

### 12.1 Build
- [ ] **TC-077**: Compilación sin errores
  - `npm run build`
  - **Resultado esperado**: Build exitoso, 23 páginas estáticas
  
- [ ] **TC-078**: TypeScript sin errores
  - **Resultado esperado**: ✓ Checking validity of types

### 12.2 Deployment
- [ ] **TC-079**: Sync a S3
  - **Resultado esperado**: Archivos subidos correctamente
  
- [ ] **TC-080**: Invalidación de CloudFront
  - **Resultado esperado**: Cache limpiado, cambios visibles inmediatamente
  
- [ ] **TC-081**: Lambda deployment
  - **Resultado esperado**: Funciones actualizadas en AWS

---

## 13. CASOS DE USO COMPLETOS

### Escenario 1: Reserva de Sala de Reuniones
```
Usuario: María (Manager)
Objetivo: Reservar sala para reunión del equipo

Pasos:
1. Login como María
2. Navegar a /reservas
3. Click "New Reservation"
4. Seleccionar "Sala de Juntas A"
5. Fecha: Mañana 10:00 - 11:00
6. Propósito: "Reunión trimestral"
7. Número de asistentes: 8
8. Guardar

Resultado esperado:
- Reserva creada en estado "pendiente"
- Aparece en lista después de ~2 segundos
- Email de confirmación enviado (si está configurado)
- Admin puede aprobar/rechazar
```

### Escenario 2: Multitenancy - Empresas Independientes
```
Setup:
- Empresa A: "TechCorp"
- Empresa B: "DesignHub"
- Mismo espacio: "Conference Room 1"

Pasos:
1. Usuario de TechCorp crea reserva para Conference Room 1 (10:00-11:00)
2. Usuario de DesignHub intenta crear reserva para Conference Room 1 (10:00-11:00)

Resultado esperado:
- Ambas reservas se crean exitosamente
- No hay conflicto entre empresas
- Cada empresa solo ve sus propias reservas
```

### Escenario 3: Cambio de Idioma Global
```
Usuario: Juan (Admin)
Objetivo: Personalizar sistema para equipo japonés

Pasos:
1. Login como Juan
2. Ir a Configuración
3. Cambiar idioma a 日本語 (Japonés)
4. Navegar por: Dashboard, Espacios, Reservas, Theme Editor
5. Intentar crear reserva en pasado (ver error)
6. Intentar crear reserva en horario ocupado (ver error)

Resultado esperado:
- Toda la UI en japonés
- Mensajes de error en japonés
- Editor de temas en japonés (57 claves)
- Sin textos sin traducir
```

---

## MATRIZ DE PRIORIDAD

| Prioridad | Categoría | Casos de Prueba |
|-----------|-----------|-----------------|
| **P0 - Crítico** | Autenticación | TC-004, TC-007, TC-008 |
| **P0 - Crítico** | Reservas | TC-017, TC-018, TC-019, TC-057 |
| **P0 - Crítico** | Multitenancy | TC-029, TC-030 |
| **P1 - Alto** | Espacios | TC-009, TC-011, TC-013 |
| **P1 - Alto** | i18n | TC-031-TC-037 |
| **P1 - Alto** | Seguridad | TC-067, TC-068, TC-070 |
| **P2 - Medio** | Temas | TC-040-TC-049 |
| **P2 - Medio** | Responsive | TC-050, TC-054 |
| **P3 - Bajo** | Accesibilidad | TC-072-TC-076 |
| **P3 - Bajo** | Performance | TC-062-TC-064 |

---

## AMBIENTE DE PRUEBAS

### URLs
- **Frontend**: https://d14088jtgw7s5t.cloudfront.net
- **API**: https://mui3vsx73f.execute-api.us-east-1.amazonaws.com/api

### Credenciales de Prueba
```
Admin:
  Email: admin@test.com
  Password: [usar credenciales reales]

Usuario Regular:
  Email: user@test.com
  Password: [usar credenciales reales]
```

### Navegadores Soportados
- [x] Chrome/Edge (>= 90)
- [x] Firefox (>= 88)
- [x] Safari (>= 14)
- [x] Mobile Safari (iOS >= 14)
- [x] Chrome Mobile (Android >= 8)

---

## REPORTE DE BUGS

**Template:**
```
ID: BUG-XXX
Título: [Descripción corta]
Severidad: [Crítica | Alta | Media | Baja]
Pasos para reproducir:
  1. ...
  2. ...
  3. ...
Resultado esperado: ...
Resultado actual: ...
Navegador: ...
Build ID: ...
Screenshots: [adjuntar]
Console logs: [adjuntar]
```

---

## CRITERIOS DE ACEPTACIÓN

### Funcionalidad ✅
- [ ] Todas las pruebas P0 pasadas al 100%
- [ ] Pruebas P1 pasadas al 95%
- [ ] Sin bugs críticos pendientes

### Performance ✅
- [ ] LCP < 2.5s en 95% de las cargas
- [ ] FCP < 1.5s en 90% de las cargas
- [ ] Sin errores de consola en flujos principales

### i18n ✅
- [ ] 10 idiomas completamente traducidos
- [ ] Mensajes de error localizados
- [ ] Editor de temas funcional en todos los idiomas

### Multitenancy ✅
- [ ] Aislamiento perfecto entre empresas
- [ ] Sin data leaks entre tenants
- [ ] Conflictos de reserva solo intra-empresa

---

## NOTAS FINALES

**Últimas correcciones realizadas:**
1. ✅ Fix de multitenancy en validación de conflictos de reservas
2. ✅ Traducción de errorSpaceReserved en 10 idiomas
3. ✅ Estrategia de retry para eventual consistency de DynamoDB
4. ✅ Corrección de filtros en lista de reservas

**Build actual:** QaEKt6yc-RKvBYw94cKic  
**Fecha de última actualización:** 9 de diciembre de 2025  
**Estado:** ✅ LISTO PARA PRODUCCIÓN
