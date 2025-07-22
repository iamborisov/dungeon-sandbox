#!/bin/bash

# run-tests.sh - Automated test runner for the Telegram Gaussian Splat Viewer

set -e

echo "🚀 Telegram Gaussian Splat Viewer - Test Suite"
echo "=============================================="

# Check if server is running
if ! pgrep -f "node server.js" > /dev/null; then
    echo "📋 Starting test server..."
    npm start > test-server.log 2>&1 &
    SERVER_PID=$!
    sleep 3
    
    # Check if server started successfully
    if ! curl -s http://localhost:3000/health > /dev/null; then
        echo "❌ Failed to start test server"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    
    echo "✅ Test server started (PID: $SERVER_PID)"
else
    echo "✅ Server already running"
    SERVER_PID=""
fi

# Run tests
echo ""
echo "📋 Running application tests..."
if node test-app.js; then
    echo "✅ Application tests passed!"
    TEST_RESULT=0
else
    echo "❌ Application tests failed!"
    TEST_RESULT=1
fi

# Cleanup
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo "📋 Stopping test server..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo "✅ Test server stopped"
fi

# Summary
echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED - Ready for deployment!"
    exit 0
else
    echo "❌ TESTS FAILED - Fix issues before deployment!"
    exit 1
fi