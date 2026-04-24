#!/bin/bash

# Script para testar integração completa Zeus Financeiro

echo "🚀 Testando integração Zeus Financeiro..."
echo ""

# URLs
WEB_URL="https://zeus-web-production.up.railway.app"
API_URL="https://zeusapi-production-b66c.up.railway.app"
VERCEL_URL="https://zeus-financeiro-mw1ycfa73-angelo-goncalves-projects.vercel.app"

echo "📍 URLs:"
echo "  Web (Railway): $WEB_URL"
echo "  API (Railway): $API_URL"
echo "  Web (Vercel): $VERCEL_URL"
echo ""

# Teste 1: Web service no Railway
echo "✓ Teste 1: Web Service (Railway)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL")
if [ "$RESPONSE" = "200" ]; then
  echo "  ✅ Web service respondendo (HTTP 200)"
else
  echo "  ❌ Web service retornou HTTP $RESPONSE"
fi
echo ""

# Teste 2: API service
echo "✓ Teste 2: API Service"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null)
if [ "$RESPONSE" = "200" ]; then
  echo "  ✅ API service respondendo (HTTP 200)"
else
  echo "  ⚠️  API retornou HTTP $RESPONSE (pode estar em cold start)"
fi
echo ""

# Teste 3: Frontend Vercel
echo "✓ Teste 3: Frontend (Vercel)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$VERCEL_URL" 2>/dev/null)
if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "200" ]; then
  echo "  ✅ Frontend respondendo"
else
  echo "  ❌ Frontend retornou HTTP $RESPONSE"
fi
echo ""

echo "✨ Testes concluídos!"
