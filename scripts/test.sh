#!/bin/bash

# test.sh — MCP Task Manager test script
# give this file permissions to run: `chmod +x scripts/test.sh`
# run this script with: `./scripts/test.sh`
# server should be running on localhost:3000 before executing this script

set -e

echo "🚀 Starting MCP Task Manager test..."

# Step 1: Create a task
echo "🔧 Creating a task..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/tools/create-task \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish MCP workshop"}')

echo "$CREATE_RESPONSE" | jq .

# Step 2: Extract task ID
TASK_ID=$(echo "$CREATE_RESPONSE" | jq '.task.id')
echo "🆔 Extracted Task ID: $TASK_ID"

# Step 3: Mark task as complete
echo "✅ Marking task as complete..."
curl -s -X POST http://localhost:3000/tools/mark-complete \
  -H "Content-Type: application/json" \
  -d "{\"id\":$TASK_ID}" | jq .

# Step 4: List all tasks
echo -e "\n📋 Listing all tasks..."
curl -s http://localhost:3000/tools/list-tasks | jq .

echo -e "\n🏁 Test complete."
# End of script