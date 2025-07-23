#!/usr/bin/env node

// test-app.js - Test the complete app functionality
const http = require('http');

console.log('🧪 Testing Complete App Functionality...\n');

function testEndpoint(path, expectedContent) {
    return new Promise((resolve) => {
        console.log(`📋 Testing ${path}...`);
        
        const req = http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const success = res.statusCode === 200 && data.includes(expectedContent);
                
                if (success) {
                    console.log(`✅ ${path}: OK (${data.length} bytes)`);
                } else {
                    console.log(`❌ ${path}: FAIL (Status: ${res.statusCode}, Expected: ${expectedContent})`);
                }
                
                resolve({ success, status: res.statusCode, data: data.substring(0, 200) });
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ ${path}: ERROR (${error.message})`);
            resolve({ success: false, error: error.message });
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            console.log(`❌ ${path}: TIMEOUT`);
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function runTests() {
    const tests = [
        { path: '/health', expected: 'status' },
        { path: '/', expected: 'Three.js' },
        { path: '/', expected: 'initThreeJS' },
        { path: '/', expected: 'OrbitControls' },
        { path: '/', expected: 'Gaussian Splat' },
        { path: '/assets', expected: 'contents' },
        { path: '/assets/test.txt', expected: 'test file' }
    ];
    
    let passed = 0;
    
    for (const test of tests) {
        const result = await testEndpoint(test.path, test.expected);
        if (result.success) passed++;
        console.log('');
    }
    
    console.log(`📊 Test Results: ${passed}/${tests.length} passed`);
    
    if (passed === tests.length) {
        console.log('🎉 All tests passed! App is ready for deployment.');
        return true;
    } else {
        console.log('❌ Some tests failed. Fix issues before deployment.');
        return false;
    }
}

async function main() {
    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const success = await runTests();
    process.exit(success ? 0 : 1);
}

main().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});