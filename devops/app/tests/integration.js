const axios = require('axios');

// ========================================
// INTEGRATION TESTS - SISTEMA DE GESTIÓN DE ESPACIOS
// ========================================

const config = {
    monitorUrl: process.env.MONITOR_URL || 'http://localhost:3000',
    apiBaseUrl: process.env.API_BASE_URL || 'https://api.sistema-espacios.com',
    frontendUrl: process.env.FRONTEND_URL || 'https://sistema-espacios.com',
    timeout: 10000
};

class IntegrationTester {
    constructor() {
        this.results = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }

    async runTest(name, testFn) {
        this.totalTests++;
        console.log(`\n🧪 Testing: ${name}`);
        
        try {
            const result = await testFn();
            this.passedTests++;
            console.log(`✅ PASS: ${name}`);
            this.results.push({ name, status: 'PASS', result });
        } catch (error) {
            console.log(`❌ FAIL: ${name} - ${error.message}`);
            this.results.push({ name, status: 'FAIL', error: error.message });
        }
    }

    async testMonitorHealth() {
        const response = await axios.get(`${config.monitorUrl}/health`, { timeout: config.timeout });
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        if (!response.data.status || response.data.status !== 'OK') {
            throw new Error(`Expected status OK, got ${response.data.status}`);
        }
        
        return response.data;
    }

    async testMonitorStatus() {
        const response = await axios.get(`${config.monitorUrl}/status`, { timeout: config.timeout });
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const requiredFields = ['backend', 'frontend', 'database', 'uptime'];
        for (const field of requiredFields) {
            if (!(field in response.data)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        return response.data;
    }

    async testMonitorMetrics() {
        const response = await axios.get(`${config.monitorUrl}/metrics`, { timeout: config.timeout });
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const metrics = response.data.metrics;
        if (!metrics || !metrics.uptime_seconds) {
            throw new Error('Missing uptime_seconds in metrics');
        }
        
        if (typeof metrics.uptime_seconds !== 'number') {
            throw new Error('uptime_seconds should be a number');
        }
        
        return response.data;
    }

    async testBackendAvailability() {
        try {
            const response = await axios.get(`${config.apiBaseUrl}/health`, { 
                timeout: config.timeout,
                validateStatus: (status) => status < 500 // Accept 4xx as valid responses
            });
            
            if (response.status === 200) {
                return { status: 'healthy', response: response.data };
            } else if (response.status === 404) {
                // Try auth endpoint instead
                const authResponse = await axios.get(`${config.apiBaseUrl}/auth/me`, { 
                    timeout: config.timeout,
                    validateStatus: (status) => status === 401 
                });
                
                if (authResponse.status === 401) {
                    return { status: 'healthy', note: 'Backend responding correctly with auth protection' };
                }
            }
            
            throw new Error(`Unexpected status: ${response.status}`);
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Backend not available (connection refused)');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('Backend timeout (may be in cold start)');
            }
            throw error;
        }
    }

    async testFrontendAvailability() {
        try {
            const response = await axios.get(config.frontendUrl, { 
                timeout: config.timeout,
                headers: {
                    'User-Agent': 'DevOps-IntegrationTest/1.0'
                }
            });
            
            if (response.status !== 200) {
                throw new Error(`Expected status 200, got ${response.status}`);
            }
            
            // Check if it's actually HTML content
            const contentType = response.headers['content-type'] || '';
            if (!contentType.includes('html')) {
                throw new Error(`Expected HTML content, got ${contentType}`);
            }
            
            return { status: 'available', contentType };
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Frontend not available (connection refused)');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('Frontend timeout');
            }
            throw error;
        }
    }

    async testMonitorBackendConnection() {
        const statusResponse = await axios.get(`${config.monitorUrl}/status`, { timeout: config.timeout });
        
        if (!statusResponse.data.backend) {
            throw new Error('Monitor is not reporting backend status');
        }
        
        const backendStatus = statusResponse.data.backend;
        const validStatuses = ['healthy', 'unhealthy', 'unknown'];
        
        if (!validStatuses.includes(backendStatus)) {
            throw new Error(`Invalid backend status: ${backendStatus}`);
        }
        
        return { backendStatus };
    }

    async testEndToEndFlow() {
        // Test complete flow: Monitor → Backend/Frontend monitoring
        const [monitorResponse, statusResponse] = await Promise.all([
            axios.get(`${config.monitorUrl}/health`, { timeout: config.timeout }),
            axios.get(`${config.monitorUrl}/status`, { timeout: config.timeout })
        ]);
        
        if (monitorResponse.data.status !== 'OK') {
            throw new Error('Monitor health check failed');
        }
        
        const status = statusResponse.data;
        const components = ['backend', 'frontend', 'database'];
        const healthyComponents = components.filter(comp => status[comp] === 'healthy').length;
        const totalComponents = components.length;
        
        if (healthyComponents === 0) {
            throw new Error('No components are healthy');
        }
        
        return { 
            healthyComponents, 
            totalComponents, 
            healthPercentage: (healthyComponents / totalComponents * 100).toFixed(1)
        };
    }

    async runAllTests() {
        console.log('🚀 Iniciando Integration Tests - Sistema de Gestión de Espacios');
        console.log('=' .repeat(60));
        console.log(`Monitor URL: ${config.monitorUrl}`);
        console.log(`API Base URL: ${config.apiBaseUrl}`);
        console.log(`Frontend URL: ${config.frontendUrl}`);
        console.log('=' .repeat(60));

        // Core monitor tests
        await this.runTest('Monitor Health Check', () => this.testMonitorHealth());
        await this.runTest('Monitor Status Endpoint', () => this.testMonitorStatus());
        await this.runTest('Monitor Metrics Endpoint', () => this.testMonitorMetrics());

        // External services tests
        await this.runTest('Backend Availability', () => this.testBackendAvailability());
        await this.runTest('Frontend Availability', () => this.testFrontendAvailability());

        // Integration tests
        await this.runTest('Monitor-Backend Connection', () => this.testMonitorBackendConnection());
        await this.runTest('End-to-End Flow', () => this.testEndToEndFlow());

        this.printSummary();
        return this.passedTests === this.totalTests;
    }

    printSummary() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 INTEGRATION TESTS SUMMARY');
        console.log('=' .repeat(60));
        console.log(`Total Tests: ${this.totalTests}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.totalTests - this.passedTests}`);
        console.log(`Success Rate: ${(this.passedTests / this.totalTests * 100).toFixed(1)}%`);
        
        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 ALL TESTS PASSED - Sistema de Gestión de Espacios is fully operational!');
        } else {
            console.log('\n⚠️  SOME TESTS FAILED - Please check the system configuration');
            
            const failedTests = this.results.filter(r => r.status === 'FAIL');
            if (failedTests.length > 0) {
                console.log('\nFailed Tests:');
                failedTests.forEach(test => {
                    console.log(`❌ ${test.name}: ${test.error}`);
                });
            }
        }
        
        console.log('=' .repeat(60));
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new IntegrationTester();
    tester.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Integration tests failed with error:', error.message);
            process.exit(1);
        });
}

module.exports = IntegrationTester;