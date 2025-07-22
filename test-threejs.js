#!/usr/bin/env node

// test-threejs.js - Test Three.js CDN loading
const https = require('https');
const http = require('http');

console.log('🧪 Testing Three.js CDN Sources...\n');

const cdnSources = [
    {
        name: 'JSDelivr',
        url: 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js',
        controlsUrl: 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/js/controls/OrbitControls.js'
    },
    {
        name: 'UNPKG',
        url: 'https://unpkg.com/three@0.158.0/build/three.min.js',
        controlsUrl: 'https://unpkg.com/three@0.158.0/examples/js/controls/OrbitControls.js'
    },
    {
        name: 'CDNJS',
        url: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r158/three.min.js',
        controlsUrl: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r158/controls/OrbitControls.min.js'
    },
    {
        name: 'Official',
        url: 'https://threejs.org/build/three.min.js',
        controlsUrl: 'https://threejs.org/examples/js/controls/OrbitControls.js'
    }
];

function testUrl(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https:') ? https : http;
        
        const req = client.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
                // Stop after getting some data to check if it loads
                if (data.length > 1000) {
                    req.destroy();
                }
            });
            
            res.on('end', () => {
                const hasThree = data.includes('THREE') || data.includes('three');
                resolve({
                    success: res.statusCode === 200 && hasThree,
                    status: res.statusCode,
                    size: data.length,
                    hasThree
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Timeout'
            });
        });
    });
}

async function testAllSources() {
    let workingSource = null;
    
    for (const source of cdnSources) {
        console.log(`📋 Testing ${source.name}...`);
        
        // Test main Three.js file
        const mainTest = await testUrl(source.url);
        
        if (mainTest.success) {
            console.log(`✅ ${source.name} main file: OK (${mainTest.size} bytes)`);
            
            // Test controls file
            const controlsTest = await testUrl(source.controlsUrl);
            
            if (controlsTest.success) {
                console.log(`✅ ${source.name} controls: OK (${controlsTest.size} bytes)`);
                workingSource = source;
                break;
            } else {
                console.log(`❌ ${source.name} controls: FAIL (${controlsTest.error || 'Invalid content'})`);
            }
        } else {
            console.log(`❌ ${source.name} main file: FAIL (${mainTest.error || 'Status: ' + mainTest.status})`);
        }
        
        console.log('');
    }
    
    return workingSource;
}

async function main() {
    const workingSource = await testAllSources();
    
    if (workingSource) {
        console.log('🎉 RECOMMENDED CDN SOURCE:');
        console.log(`   Name: ${workingSource.name}`);
        console.log(`   THREE.js: ${workingSource.url}`);
        console.log(`   Controls: ${workingSource.controlsUrl}`);
        console.log('');
        
        // Generate the fixed HTML
        console.log('📋 Use these script tags:');
        console.log(`<script src="${workingSource.url}"></script>`);
        console.log(`<script src="${workingSource.controlsUrl}"></script>`);
        
        process.exit(0);
    } else {
        console.log('❌ No working CDN source found!');
        console.log('Consider using a local Three.js build or different approach.');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});