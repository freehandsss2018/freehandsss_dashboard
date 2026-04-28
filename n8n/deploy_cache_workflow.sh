#!/bin/bash

# Get the n8n API credentials from .env
N8N_INSTANCE="https://yanhei.synology.me:8443"
N8N_API_KEY=$(grep "N8N_KEY=" ../.env | cut -d'=' -f2)

if [ -z "$N8N_API_KEY" ]; then
  echo "❌ N8N_KEY not found in .env"
  exit 1
fi

echo "🔍 Searching for FHS_Query_GlobalReview workflow..."

# Get all workflows
WORKFLOWS=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_INSTANCE/api/v1/workflows" | jq -r '.data[] | select(.name=="FHS_Query_GlobalReview") | .id' | head -1)

if [ -z "$WORKFLOWS" ]; then
  echo "❌ FHS_Query_GlobalReview workflow not found"
  exit 1
fi

echo "✅ Found workflow ID: $WORKFLOWS"

# Show the workflow for verification
echo "📋 Current workflow structure:"
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_INSTANCE/api/v1/workflows/$WORKFLOWS" | jq '.name' -r

echo "✅ Ready to deploy cached version"
echo "   Workflow ID: $WORKFLOWS"
echo "   API Key: (set)"
echo "   Instance: $N8N_INSTANCE"
