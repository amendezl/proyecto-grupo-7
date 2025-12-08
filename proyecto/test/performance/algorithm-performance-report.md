# Reporte de Análisis de Rendimiento de Algoritmos
        
Generado: 2025-12-08T21:17:03.451Z

## Resumen

Total de algoritmos probados: 24

## Resultados Detallados

| Nombre del Algoritmo | Orden de Magnitud | Tamaño de Datos | Tiempo Promedio (ms) | Tiempo Mín (ms) | Tiempo Máx (ms) | Desv Est (ms) | Iteraciones |
|----------------------|-------------------|-----------------|----------------------|-----------------|-----------------|---------------|-------------|
| Filtrar Espacios por empresa_id | O(n) | 100 | 0.0038 | 0.0019 | 0.5120 | 0.0178 | 1000 |
| Filtrar Espacios por empresa_id | O(n) | 1000 | 0.0203 | 0.0149 | 0.4331 | 0.0257 | 1000 |
| Filtrar Espacios por empresa_id | O(n) | 5000 | 0.0887 | 0.0733 | 0.6450 | 0.0352 | 1000 |
| Filtrar Reservas por estado y empresa_id | O(n) | 1000 | 3.4200 | 3.0652 | 7.8625 | 0.5427 | 1000 |
| Filtrar Reservas por rango de fecha | O(n) | 1000 | 4.1474 | 3.6980 | 28.0090 | 1.0588 | 1000 |
| Mapear Espacios a objetos simplificados | O(n) | 1000 | 1.9557 | 1.3443 | 4.8661 | 0.5879 | 1000 |
| Mapear con truncado de texto | O(n) | 5000 | 9.8592 | 6.7668 | 52.9080 | 2.6933 | 1000 |
| Reducir para contar espacios por estado | O(n) | 1000 | 1.8577 | 1.3240 | 5.3261 | 0.4793 | 1000 |
| Reducir para sumar capacidad total | O(n) | 5000 | 9.2707 | 6.7002 | 22.8650 | 2.1083 | 1000 |
| Reducir para construir mapa de IDs | O(n) | 2000 | 4.4593 | 2.9634 | 11.3001 | 1.1437 | 1000 |
| Ordenar Reservas por fecha_inicio | O(n log n) | 1000 | 5.4555 | 4.0950 | 11.6290 | 1.0932 | 1000 |
| Ordenar Reservas por fecha_inicio | O(n log n) | 5000 | 30.2938 | 21.1867 | 127.3530 | 8.3819 | 1000 |
| Ordenar Espacios por nombre | O(n log n) | 2000 | 4.6644 | 3.1282 | 39.5154 | 1.9187 | 1000 |
| Buscar Espacio por ID | O(n) | 1000 | 1.8459 | 1.2926 | 4.3817 | 0.4587 | 1000 |
| Buscar Espacio por ID | O(n) | 10000 | 19.2415 | 13.3659 | 44.4754 | 4.3137 | 1000 |
| Filtrar + Ordenar + Limitar (reservas próximas) | O(n log n) | 1000 | 5.1749 | 3.6990 | 10.4749 | 1.0715 | 1000 |
| Filtrar + Mapear + Reducir (cálculo de estadísticas) | O(n) | 2000 | 3.5619 | 2.6287 | 7.2613 | 0.8460 | 1000 |
| Verificar qué espacios están ocupados ahora | O(n * m) | 100 | 3.5913 | 2.4980 | 9.5192 | 1.0873 | 1000 |
| Operaciones de cola (encolar/desencolar) | O(1) amortizado | 1000 | 0.1166 | 0.0855 | 0.4544 | 0.0296 | 1000 |
| Operaciones de Map set/get | O(1) | 10000 | 2.5799 | 1.7043 | 8.4200 | 0.7815 | 1000 |
| Acceso a propiedades de objeto | O(1) | 5000 | 1.8691 | 1.2221 | 4.5864 | 0.4289 | 1000 |
| Concatenación de cadenas (ineficiente) | O(n²) | 1000 | 0.0335 | 0.0269 | 0.4911 | 0.0285 | 1000 |
| Unión de cadenas (eficiente) | O(n) | 1000 | 0.0653 | 0.0481 | 0.6056 | 0.0337 | 1000 |
| Paginación con slice | O(1) | 10000 | 19.6631 | 13.7520 | 92.4752 | 5.2894 | 1000 |

## Descripciones de Algoritmos

### Filtrar Espacios por empresa_id

- **Complejidad**: O(n)
- **Descripción**: Búsqueda lineal en array para filtrar por empresa_id
- **Tamaño de Datos Probado**: 100 elementos
- **Tiempo Promedio de Ejecución**: 0.0038 ms
- **Iteraciones**: 1000

### Filtrar Espacios por empresa_id

- **Complejidad**: O(n)
- **Descripción**: Búsqueda lineal en array para filtrar por empresa_id
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 0.0203 ms
- **Iteraciones**: 1000

### Filtrar Espacios por empresa_id

- **Complejidad**: O(n)
- **Descripción**: Búsqueda lineal en array para filtrar por empresa_id
- **Tamaño de Datos Probado**: 5000 elementos
- **Tiempo Promedio de Ejecución**: 0.0887 ms
- **Iteraciones**: 1000

### Filtrar Reservas por estado y empresa_id

- **Complejidad**: O(n)
- **Descripción**: Operación de filtrado con múltiples condiciones
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 3.4200 ms
- **Iteraciones**: 1000

### Filtrar Reservas por rango de fecha

- **Complejidad**: O(n)
- **Descripción**: Filtrado por rango de fecha para reservas próximas
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 4.1474 ms
- **Iteraciones**: 1000

### Mapear Espacios a objetos simplificados

- **Complejidad**: O(n)
- **Descripción**: Transformar espacios a formato optimizado para móvil
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 1.9557 ms
- **Iteraciones**: 1000

### Mapear con truncado de texto

- **Complejidad**: O(n)
- **Descripción**: Optimización de escalado vertical con truncado de texto
- **Tamaño de Datos Probado**: 5000 elementos
- **Tiempo Promedio de Ejecución**: 9.8592 ms
- **Iteraciones**: 1000

### Reducir para contar espacios por estado

- **Complejidad**: O(n)
- **Descripción**: Operación de conteo agregado para estadísticas del dashboard
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 1.8577 ms
- **Iteraciones**: 1000

### Reducir para sumar capacidad total

- **Complejidad**: O(n)
- **Descripción**: Calcular capacidad total de todos los espacios
- **Tamaño de Datos Probado**: 5000 elementos
- **Tiempo Promedio de Ejecución**: 9.2707 ms
- **Iteraciones**: 1000

### Reducir para construir mapa de IDs

- **Complejidad**: O(n)
- **Descripción**: Crear mapa de búsqueda para acceso rápido
- **Tamaño de Datos Probado**: 2000 elementos
- **Tiempo Promedio de Ejecución**: 4.4593 ms
- **Iteraciones**: 1000

### Ordenar Reservas por fecha_inicio

- **Complejidad**: O(n log n)
- **Descripción**: Ordenamiento cronológico para reservas próximas
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 5.4555 ms
- **Iteraciones**: 1000

### Ordenar Reservas por fecha_inicio

- **Complejidad**: O(n log n)
- **Descripción**: Ordenamiento cronológico para reservas próximas
- **Tamaño de Datos Probado**: 5000 elementos
- **Tiempo Promedio de Ejecución**: 30.2938 ms
- **Iteraciones**: 1000

### Ordenar Espacios por nombre

- **Complejidad**: O(n log n)
- **Descripción**: Ordenamiento alfabético con comparación de locale
- **Tamaño de Datos Probado**: 2000 elementos
- **Tiempo Promedio de Ejecución**: 4.6644 ms
- **Iteraciones**: 1000

### Buscar Espacio por ID

- **Complejidad**: O(n)
- **Descripción**: Búsqueda lineal de un elemento
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 1.8459 ms
- **Iteraciones**: 1000

### Buscar Espacio por ID

- **Complejidad**: O(n)
- **Descripción**: Búsqueda lineal de un elemento en conjunto de datos grande
- **Tamaño de Datos Probado**: 10000 elementos
- **Tiempo Promedio de Ejecución**: 19.2415 ms
- **Iteraciones**: 1000

### Filtrar + Ordenar + Limitar (reservas próximas)

- **Complejidad**: O(n log n)
- **Descripción**: Operaciones combinadas de filtrado, ordenamiento y limitación
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 5.1749 ms
- **Iteraciones**: 1000

### Filtrar + Mapear + Reducir (cálculo de estadísticas)

- **Complejidad**: O(n)
- **Descripción**: Pipeline para calcular capacidad disponible
- **Tamaño de Datos Probado**: 2000 elementos
- **Tiempo Promedio de Ejecución**: 3.5619 ms
- **Iteraciones**: 1000

### Verificar qué espacios están ocupados ahora

- **Complejidad**: O(n * m)
- **Descripción**: Bucle anidado para verificar conflictos de reserva (100 espacios × 500 reservas)
- **Tamaño de Datos Probado**: 100 elementos
- **Tiempo Promedio de Ejecución**: 3.5913 ms
- **Iteraciones**: 1000

### Operaciones de cola (encolar/desencolar)

- **Complejidad**: O(1) amortizado
- **Descripción**: Operaciones de cola FIFO para encolamiento de solicitudes
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 0.1166 ms
- **Iteraciones**: 1000

### Operaciones de Map set/get

- **Complejidad**: O(1)
- **Descripción**: Operaciones de hash map para caché
- **Tamaño de Datos Probado**: 10000 elementos
- **Tiempo Promedio de Ejecución**: 2.5799 ms
- **Iteraciones**: 1000

### Acceso a propiedades de objeto

- **Complejidad**: O(1)
- **Descripción**: Búsqueda de propiedad de objeto
- **Tamaño de Datos Probado**: 5000 elementos
- **Tiempo Promedio de Ejecución**: 1.8691 ms
- **Iteraciones**: 1000

### Concatenación de cadenas (ineficiente)

- **Complejidad**: O(n²)
- **Descripción**: Concatenación de cadenas ineficiente
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 0.0335 ms
- **Iteraciones**: 1000

### Unión de cadenas (eficiente)

- **Complejidad**: O(n)
- **Descripción**: Construcción eficiente de cadenas con array join
- **Tamaño de Datos Probado**: 1000 elementos
- **Tiempo Promedio de Ejecución**: 0.0653 ms
- **Iteraciones**: 1000

### Paginación con slice

- **Complejidad**: O(1)
- **Descripción**: Rebanado de array para paginación (tiempo constante para operación slice)
- **Tamaño de Datos Probado**: 10000 elementos
- **Tiempo Promedio de Ejecución**: 19.6631 ms
- **Iteraciones**: 1000


## Análisis de Rendimiento

### Algoritmos Más Lentos

1. **Ordenar Reservas por fecha_inicio** - 30.2938 ms (O(n log n))
2. **Paginación con slice** - 19.6631 ms (O(1))
3. **Buscar Espacio por ID** - 19.2415 ms (O(n))
4. **Mapear con truncado de texto** - 9.8592 ms (O(n))
5. **Reducir para sumar capacidad total** - 9.2707 ms (O(n))

### Algoritmos Más Rápidos

1. **Filtrar Espacios por empresa_id** - 0.0038 ms (O(n))
2. **Filtrar Espacios por empresa_id** - 0.0203 ms (O(n))
3. **Concatenación de cadenas (ineficiente)** - 0.0335 ms (O(n²))
4. **Unión de cadenas (eficiente)** - 0.0653 ms (O(n))
5. **Filtrar Espacios por empresa_id** - 0.0887 ms (O(n))

### Algoritmos por Clase de Complejidad

- **O(1)**: 3 algoritmos, promedio 8.0374 ms
- **O(1) amortizado**: 1 algoritmos, promedio 0.1166 ms
- **O(n * m)**: 1 algoritmos, promedio 3.5913 ms
- **O(n log n)**: 4 algoritmos, promedio 11.3971 ms
- **O(n)**: 14 algoritmos, promedio 4.2712 ms
- **O(n²)**: 1 algoritmos, promedio 0.0335 ms
