/**
 * Algorithm Performance Analysis Test Suite
 * Analyzes computational complexity and execution time of algorithms used in the project
 * 
 * Tests include:
 * - Array filtering operations
 * - Array mapping operations
 * - Array reduction operations
 * - Sorting algorithms
 * - Search operations
 * - Queue processing (Circuit Breaker)
 * - Cache operations (Idempotency)
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m'
};

class PerformanceAnalyzer {
    constructor() {
        this.results = [];
    }

    /**
     * Test a function and measure its performance
     */
    async testAlgorithm(name, algorithmFn, dataSize, orderOfMagnitude, description = '') {
        console.log(`${colors.cyan}Probando: ${name}${colors.reset}`);
        console.log(`  Tamaño de datos: ${dataSize} elementos`);
        console.log(`  Complejidad esperada: ${orderOfMagnitude}`);
        
        // Warm up
        for (let i = 0; i < 3; i++) {
            await algorithmFn();
        }

        // Measure multiple iterations
        //ITERATIONS
        //ITERATIONS
        //ITERATIONS
        //ITERATIONS
        //ITERATIONS
        //ITERATIONS
        
        const iterations = 1000;
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await algorithmFn();
            const end = performance.now();
            times.push(end - start);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const stdDev = Math.sqrt(
            times.reduce((sq, n) => sq + Math.pow(n - avgTime, 2), 0) / times.length
        );

        const result = {
            name,
            description,
            dataSize,
            orderOfMagnitude,
            avgExecutionTime: avgTime.toFixed(4),
            minExecutionTime: minTime.toFixed(4),
            maxExecutionTime: maxTime.toFixed(4),
            stdDeviation: stdDev.toFixed(4),
            iterations
        };

        this.results.push(result);

        console.log(`${colors.green}  ✓ Tiempo Promedio: ${avgTime.toFixed(4)} ms${colors.reset}`);
        console.log(`${colors.yellow}  Mín: ${minTime.toFixed(4)} ms | Máx: ${maxTime.toFixed(4)} ms${colors.reset}`);
        console.log(`${colors.blue}  Iteraciones: ${iterations}${colors.reset}`);
        console.log('');

        return result;
    }

    generateReport() {
        console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════════════════════════╗
║        REPORTE DE ANÁLISIS DE RENDIMIENTO DE ALGORITMOS              ║
╚═══════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

        // Console table
        console.table(
            this.results.map(r => ({
                'Algoritmo': r.name,
                'Tamaño de Datos': r.dataSize,
                'Complejidad': r.orderOfMagnitude,
                'Tiempo Prom (ms)': r.avgExecutionTime,
                'Tiempo Mín (ms)': r.minExecutionTime,
                'Tiempo Máx (ms)': r.maxExecutionTime,
                'Iteraciones': r.iterations
            }))
        );

        // Generate markdown report
        const markdown = this.generateMarkdown();
        const reportPath = path.join(__dirname, 'algorithm-performance-report.md');
        fs.writeFileSync(reportPath, markdown);
        console.log(`${colors.green}✓ Reporte guardado en: ${reportPath}${colors.reset}\n`);

        // Generate CSV
        const csv = this.generateCSV();
        const csvPath = path.join(__dirname, 'algorithm-performance-report.csv');
        fs.writeFileSync(csvPath, csv);
        console.log(`${colors.green}✓ Datos CSV guardados en: ${csvPath}${colors.reset}\n`);

        return this.results;
    }

    generateMarkdown() {
        let markdown = `# Reporte de Análisis de Rendimiento de Algoritmos
        
Generado: ${new Date().toISOString()}

## Resumen

Total de algoritmos probados: ${this.results.length}

## Resultados Detallados

| Nombre del Algoritmo | Orden de Magnitud | Tamaño de Datos | Tiempo Promedio (ms) | Tiempo Mín (ms) | Tiempo Máx (ms) | Desv Est (ms) | Iteraciones |
|----------------------|-------------------|-----------------|----------------------|-----------------|-----------------|---------------|-------------|
`;

        this.results.forEach(r => {
            markdown += `| ${r.name} | ${r.orderOfMagnitude} | ${r.dataSize} | ${r.avgExecutionTime} | ${r.minExecutionTime} | ${r.maxExecutionTime} | ${r.stdDeviation} | ${r.iterations} |\n`;
        });

        markdown += `\n## Descripciones de Algoritmos\n\n`;

        this.results.forEach(r => {
            if (r.description) {
                markdown += `### ${r.name}\n\n`;
                markdown += `- **Complejidad**: ${r.orderOfMagnitude}\n`;
                markdown += `- **Descripción**: ${r.description}\n`;
                markdown += `- **Tamaño de Datos Probado**: ${r.dataSize} elementos\n`;
                markdown += `- **Tiempo Promedio de Ejecución**: ${r.avgExecutionTime} ms\n`;
                markdown += `- **Iteraciones**: ${r.iterations}\n\n`;
            }
        });

        markdown += `\n## Análisis de Rendimiento\n\n`;
        markdown += this.generateAnalysis();

        return markdown;
    }

    generateCSV() {
        let csv = 'Nombre del Algoritmo;Orden de Magnitud;Tamaño de Datos;Tiempo Promedio (ms);Tiempo Min (ms);Tiempo Max (ms);Desviacion Estandar (ms);Iteraciones\n';
        
        this.results.forEach(r => {
            csv += `${r.name};${r.orderOfMagnitude};${r.dataSize};${r.avgExecutionTime};${r.minExecutionTime};${r.maxExecutionTime};${r.stdDeviation};${r.iterations}\n`;
        });

        return csv;
    }

    generateAnalysis() {
        let analysis = '';

        // Sort by execution time
        const sortedByTime = [...this.results].sort((a, b) => 
            parseFloat(b.avgExecutionTime) - parseFloat(a.avgExecutionTime)
        );

        analysis += `### Algoritmos Más Lentos\n\n`;
        sortedByTime.slice(0, 5).forEach((r, i) => {
            analysis += `${i + 1}. **${r.name}** - ${r.avgExecutionTime} ms (${r.orderOfMagnitude})\n`;
        });

        analysis += `\n### Algoritmos Más Rápidos\n\n`;
        sortedByTime.slice(-5).reverse().forEach((r, i) => {
            analysis += `${i + 1}. **${r.name}** - ${r.avgExecutionTime} ms (${r.orderOfMagnitude})\n`;
        });

        // Complexity analysis
        const complexities = {};
        this.results.forEach(r => {
            if (!complexities[r.orderOfMagnitude]) {
                complexities[r.orderOfMagnitude] = [];
            }
            complexities[r.orderOfMagnitude].push(r);
        });

        analysis += `\n### Algoritmos por Clase de Complejidad\n\n`;
        Object.keys(complexities).sort().forEach(complexity => {
            const count = complexities[complexity].length;
            const avgTime = complexities[complexity].reduce((sum, r) => 
                sum + parseFloat(r.avgExecutionTime), 0) / count;
            analysis += `- **${complexity}**: ${count} algoritmos, promedio ${avgTime.toFixed(4)} ms\n`;
        });

        return analysis;
    }
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

function generateEspacios(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: `espacio-${i}`,
        nombre: `Espacio ${i}`,
        tipo: ['oficina', 'sala', 'auditorio'][i % 3],
        estado: ['disponible', 'ocupado', 'mantenimiento'][i % 3],
        capacidad: Math.floor(Math.random() * 100) + 10,
        empresa_id: `empresa-${i % 10}`,
        zona_id: `zona-${i % 5}`,
        ubicacion: `Piso ${Math.floor(i / 10) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));
}

function generateReservas(count) {
    const now = Date.now();
    return Array.from({ length: count }, (_, i) => ({
        id: `reserva-${i}`,
        espacio_id: `espacio-${i % 100}`,
        usuario_id: `usuario-${i % 50}`,
        empresa_id: `empresa-${i % 10}`,
        estado: ['pendiente', 'confirmada', 'cancelada', 'completada'][i % 4],
        fecha_inicio: new Date(now + (i * 3600000)).toISOString(),
        fecha_fin: new Date(now + (i * 3600000) + 7200000).toISOString(),
        proposito: `Reunión ${i}`,
        createdAt: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
}

function generateUsuarios(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: `usuario-${i}`,
        email: `usuario${i}@example.com`,
        nombre: `Usuario ${i}`,
        apellido: `Apellido ${i}`,
        rol: ['usuario', 'admin', 'responsable'][i % 3],
        activo: i % 10 !== 0,
        empresa_id: `empresa-${i % 10}`,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));
}

// ============================================================================
// ALGORITHM TESTS
// ============================================================================

async function runTests() {
    const analyzer = new PerformanceAnalyzer();

    console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════════════════════════╗
║     INICIANDO ANÁLISIS DE RENDIMIENTO DE ALGORITMOS                  ║
╚═══════════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

    // ========================================================================
    // 1. FILTER OPERATIONS (O(n))
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[1] OPERACIONES DE FILTRADO${colors.reset}\n`);
    
    // Test 1.1: Filter by empresa_id (common in DynamoDBManager)
    const espacios100 = generateEspacios(100);
    await analyzer.testAlgorithm(
        'Filtrar Espacios por empresa_id',
        () => espacios100.filter(e => e.empresa_id === 'empresa-1'),
        100,
        'O(n)',
        'Búsqueda lineal en array para filtrar por empresa_id'
    );

    const espacios1000 = generateEspacios(1000);
    await analyzer.testAlgorithm(
        'Filtrar Espacios por empresa_id',
        () => espacios1000.filter(e => e.empresa_id === 'empresa-1'),
        1000,
        'O(n)',
        'Búsqueda lineal en array para filtrar por empresa_id'
    );

    const espacios5000 = generateEspacios(5000);
    await analyzer.testAlgorithm(
        'Filtrar Espacios por empresa_id',
        () => espacios5000.filter(e => e.empresa_id === 'empresa-1'),
        5000,
        'O(n)',
        'Búsqueda lineal en array para filtrar por empresa_id'
    );

    // Test 1.2: Multiple filter conditions
    await analyzer.testAlgorithm(
        'Filtrar Reservas por estado y empresa_id',
        () => generateReservas(1000).filter(r => r.estado === 'confirmada' && r.empresa_id === 'empresa-1'),
        1000,
        'O(n)',
        'Operación de filtrado con múltiples condiciones'
    );

    // Test 1.3: Filter with date comparison
    await analyzer.testAlgorithm(
        'Filtrar Reservas por rango de fecha',
        () => {
            const reservas = generateReservas(1000);
            const now = new Date();
            const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return reservas.filter(r => {
                const fecha = new Date(r.fecha_inicio);
                return fecha >= now && fecha <= oneWeek;
            });
        },
        1000,
        'O(n)',
        'Filtrado por rango de fecha para reservas próximas'
    );

    // ========================================================================
    // 2. MAP OPERATIONS (O(n))
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[2] OPERACIONES DE MAPEO${colors.reset}\n`);
    
    // Test 2.1: Simple transformation
    await analyzer.testAlgorithm(
        'Mapear Espacios a objetos simplificados',
        () => generateEspacios(1000).map(e => ({
            id: e.id,
            nombre: e.nombre.substring(0, 20),
            disponible: e.estado === 'disponible'
        })),
        1000,
        'O(n)',
        'Transformar espacios a formato optimizado para móvil'
    );

    // Test 2.2: Map with substring operations
    await analyzer.testAlgorithm(
        'Mapear con truncado de texto',
        () => generateEspacios(5000).map(e => ({
            ...e,
            nombre: e.nombre.length > 25 ? e.nombre.substring(0, 22) + '...' : e.nombre
        })),
        5000,
        'O(n)',
        'Optimización de escalado vertical con truncado de texto'
    );

    // ========================================================================
    // 3. REDUCE OPERATIONS (O(n))
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[3] OPERACIONES DE REDUCCIÓN${colors.reset}\n`);
    
    // Test 3.1: Count by status
    await analyzer.testAlgorithm(
        'Reducir para contar espacios por estado',
        () => generateEspacios(1000).reduce((acc, e) => {
            acc[e.estado] = (acc[e.estado] || 0) + 1;
            return acc;
        }, {}),
        1000,
        'O(n)',
        'Operación de conteo agregado para estadísticas del dashboard'
    );

    // Test 3.2: Sum capacidad total
    await analyzer.testAlgorithm(
        'Reducir para sumar capacidad total',
        () => generateEspacios(5000).reduce((total, e) => total + (e.capacidad || 0), 0),
        5000,
        'O(n)',
        'Calcular capacidad total de todos los espacios'
    );

    // Test 3.3: Build map/dictionary
    await analyzer.testAlgorithm(
        'Reducir para construir mapa de IDs',
        () => generateEspacios(2000).reduce((map, e) => {
            map[e.id] = e;
            return map;
        }, {}),
        2000,
        'O(n)',
        'Crear mapa de búsqueda para acceso rápido'
    );

    // ========================================================================
    // 4. SORT OPERATIONS (O(n log n))
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[4] OPERACIONES DE ORDENAMIENTO${colors.reset}\n`);
    
    // Test 4.1: Sort by date
    await analyzer.testAlgorithm(
        'Ordenar Reservas por fecha_inicio',
        () => {
            const reservas = generateReservas(1000);
            return reservas.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
        },
        1000,
        'O(n log n)',
        'Ordenamiento cronológico para reservas próximas'
    );

    await analyzer.testAlgorithm(
        'Ordenar Reservas por fecha_inicio',
        () => {
            const reservas = generateReservas(5000);
            return reservas.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
        },
        5000,
        'O(n log n)',
        'Ordenamiento cronológico para reservas próximas'
    );

    // Test 4.2: Sort by string
    await analyzer.testAlgorithm(
        'Ordenar Espacios por nombre',
        () => {
            const espacios = generateEspacios(2000);
            return espacios.sort((a, b) => a.nombre.localeCompare(b.nombre));
        },
        2000,
        'O(n log n)',
        'Ordenamiento alfabético con comparación de locale'
    );

    // ========================================================================
    // 5. FIND OPERATIONS (O(n))
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[5] OPERACIONES DE BÚSQUEDA${colors.reset}\n`);
    
    // Test 5.1: Find by ID
    await analyzer.testAlgorithm(
        'Buscar Espacio por ID',
        () => generateEspacios(1000).find(e => e.id === 'espacio-500'),
        1000,
        'O(n)',
        'Búsqueda lineal de un elemento'
    );

    await analyzer.testAlgorithm(
        'Buscar Espacio por ID',
        () => generateEspacios(10000).find(e => e.id === 'espacio-5000'),
        10000,
        'O(n)',
        'Búsqueda lineal de un elemento en conjunto de datos grande'
    );

    // ========================================================================
    // 6. CHAINED OPERATIONS (O(n) to O(n²))
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[6] OPERACIONES ENCADENADAS${colors.reset}\n`);
    
    // Test 6.1: Filter + Sort + Slice (common pattern)
    await analyzer.testAlgorithm(
        'Filtrar + Ordenar + Limitar (reservas próximas)',
        () => {
            const reservas = generateReservas(1000);
            const now = new Date();
            const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return reservas
                .filter(r => r.estado !== 'cancelada')
                .filter(r => {
                    const fecha = new Date(r.fecha_inicio);
                    return fecha >= now && fecha <= oneWeek;
                })
                .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
                .slice(0, 10);
        },
        1000,
        'O(n log n)',
        'Operaciones combinadas de filtrado, ordenamiento y limitación'
    );

    // Test 6.2: Filter + Map + Reduce
    await analyzer.testAlgorithm(
        'Filtrar + Mapear + Reducir (cálculo de estadísticas)',
        () => {
            const espacios = generateEspacios(2000);
            return espacios
                .filter(e => e.estado === 'disponible')
                .map(e => e.capacidad)
                .reduce((sum, cap) => sum + cap, 0);
        },
        2000,
        'O(n)',
        'Pipeline para calcular capacidad disponible'
    );

    // ========================================================================
    // 7. NESTED OPERATIONS (O(n²))
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[7] OPERACIONES ANIDADAS${colors.reset}\n`);
    
    // Test 7.1: Nested filter (checking espacio occupation)
    await analyzer.testAlgorithm(
        'Verificar qué espacios están ocupados ahora',
        () => {
            const espacios = generateEspacios(100);
            const reservas = generateReservas(500);
            const now = new Date();
            
            return espacios.map(espacio => ({
                ...espacio,
                ocupado: reservas.some(r => {
                    if (r.espacio_id !== espacio.id || r.estado === 'cancelada') return false;
                    const inicio = new Date(r.fecha_inicio);
                    const fin = new Date(r.fecha_fin);
                    return now >= inicio && now <= fin;
                })
            }));
        },
        100,
        'O(n * m)',
        'Bucle anidado para verificar conflictos de reserva (100 espacios × 500 reservas)'
    );

    // ========================================================================
    // 8. QUEUE OPERATIONS (O(1) amortized)
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[8] OPERACIONES DE COLA${colors.reset}\n`);
    
    // Test 8.1: Queue push/shift (Bulkhead pattern)
    await analyzer.testAlgorithm(
        'Operaciones de cola (encolar/desencolar)',
        () => {
            const queue = [];
            for (let i = 0; i < 1000; i++) {
                queue.push({ id: i, data: 'test' });
            }
            while (queue.length > 0) {
                queue.shift();
            }
        },
        1000,
        'O(1) amortizado',
        'Operaciones de cola FIFO para encolamiento de solicitudes'
    );

    // ========================================================================
    // 9. MAP/CACHE OPERATIONS (O(1))
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[9] OPERACIONES DE MAPA/CACHÉ${colors.reset}\n`);
    
    // Test 9.1: Map set/get (Idempotency cache)
    await analyzer.testAlgorithm(
        'Operaciones de Map set/get',
        () => {
            const cache = new Map();
            for (let i = 0; i < 10000; i++) {
                cache.set(`key-${i}`, { value: i });
            }
            for (let i = 0; i < 10000; i++) {
                cache.get(`key-${i}`);
            }
        },
        10000,
        'O(1)',
        'Operaciones de hash map para caché'
    );

    // Test 9.2: Object property access
    await analyzer.testAlgorithm(
        'Acceso a propiedades de objeto',
        () => {
            const obj = {};
            for (let i = 0; i < 5000; i++) {
                obj[`key-${i}`] = { value: i };
            }
            for (let i = 0; i < 5000; i++) {
                const val = obj[`key-${i}`];
            }
        },
        5000,
        'O(1)',
        'Búsqueda de propiedad de objeto'
    );

    // ========================================================================
    // 10. STRING OPERATIONS
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[10] OPERACIONES DE CADENAS${colors.reset}\n`);
    
    // Test 10.1: String concatenation in loop
    await analyzer.testAlgorithm(
        'Concatenación de cadenas (ineficiente)',
        () => {
            let result = '';
            for (let i = 0; i < 1000; i++) {
                result += `item-${i},`;
            }
            return result;
        },
        1000,
        'O(n²)',
        'Concatenación de cadenas ineficiente'
    );

    // Test 10.2: Array join (efficient)
    await analyzer.testAlgorithm(
        'Unión de cadenas (eficiente)',
        () => {
            const parts = [];
            for (let i = 0; i < 1000; i++) {
                parts.push(`item-${i}`);
            }
            return parts.join(',');
        },
        1000,
        'O(n)',
        'Construcción eficiente de cadenas con array join'
    );

    // ========================================================================
    // 11. PAGINATION OPERATIONS
    // ========================================================================
    
    console.log(`${colors.bright}${colors.yellow}[11] OPERACIONES DE PAGINACIÓN${colors.reset}\n`);
    
    // Test 11.1: Slice for pagination
    await analyzer.testAlgorithm(
        'Paginación con slice',
        () => {
            const items = generateEspacios(10000);
            const page = 5;
            const pageSize = 20;
            return items.slice((page - 1) * pageSize, page * pageSize);
        },
        10000,
        'O(1)',
        'Rebanado de array para paginación (tiempo constante para operación slice)'
    );

    // ========================================================================
    // GENERATE REPORT
    // ========================================================================
    
    console.log(`\n${colors.bright}Generando reportes...${colors.reset}\n`);
    analyzer.generateReport();

    console.log(`${colors.bright}${colors.green}
╔═══════════════════════════════════════════════════════════════════════╗
║                    ANÁLISIS COMPLETADO                                ║
╚═══════════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

    return analyzer.results;
}

// Run tests if executed directly
if (require.main === module) {
    runTests().catch(err => {
        console.error(`${colors.red}Error ejecutando pruebas:${colors.reset}`, err);
        process.exit(1);
    });
}

module.exports = {
    PerformanceAnalyzer,
    runTests,
    generateEspacios,
    generateReservas,
    generateUsuarios
};
