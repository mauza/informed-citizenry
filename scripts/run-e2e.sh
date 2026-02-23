#!/bin/bash

set -e

echo "🎭 Informed Citizenry E2E Test Runner"
echo "====================================="

USE_DOCKER=${USE_DOCKER:-false}
COMPOSE_FILE="docker-compose.e2e.yml"

cleanup() {
  echo ""
  echo "🧹 Cleaning up..."
  if [ "$USE_DOCKER" = "true" ]; then
    echo "  Stopping Docker containers..."
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
  fi
  echo "  Removing test artifacts..."
  rm -rf tests/.auth/user.json 2>/dev/null || true
}

trap cleanup EXIT

if [ "$1" = "--docker" ] || [ "$1" = "-d" ]; then
  USE_DOCKER=true
  echo "🐳 Docker mode enabled"
fi

echo ""
echo "📦 Step 1: Installing Playwright browsers..."
npx playwright install chromium 2>/dev/null || true

echo ""
echo "🏗️  Step 2: Building application..."
if [ "$USE_DOCKER" = "true" ]; then
  echo "  Building Docker image..."
  docker compose -f "$COMPOSE_FILE" build
else
  npm run build
fi

echo ""
echo "🚀 Step 3: Starting application..."
if [ "$USE_DOCKER" = "true" ]; then
  echo "  Starting Docker containers..."
  docker compose -f "$COMPOSE_FILE" up -d
  echo "  Waiting for app to be healthy..."
  sleep 5
  for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
      echo "  ✅ App is ready!"
      break
    fi
    echo "  ⏳ Waiting for app... ($i/30)"
    sleep 2
  done
else
  echo "  Using local dev server (already running or starting)..."
fi

echo ""
echo "🧪 Step 4: Running E2E tests..."
export E2E_TESTING=true
if [ "$USE_DOCKER" = "true" ]; then
  export E2E_USE_DOCKER=true
fi

npm run test:e2e

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All E2E tests passed!"
else
  echo "❌ Some E2E tests failed. Check the screenshots in test-results/screenshots/"
fi

exit $TEST_EXIT_CODE
