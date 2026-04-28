#!/bin/bash

# Script para testar integração completa Zeus Financeiro

echo "🚀 Testando integração Zeus Financeiro..."
echo ""

# URLs
API_URL="https://zeusapi-production-b66c.up.railway.app"
WEB_URL="https://zeus-financeiro-web.vercel.app"

echo "📍 URLs:"
echo "  API (Railway): $API_URL"
echo "  Web (Vercel):  $WEB_URL"
echo ""

# Teste 1: API health
echo "✓ Teste 1: API Service (/health)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null)
if [ "$RESPONSE" = "200" ]; then
  echo "  ✅ API respondendo (HTTP 200)"
  curl -s "$API_URL/api/v1/health" | python3 -m json.tool 2>/dev/null || true
else
  echo "  ❌ API retornou HTTP $RESPONSE (pode estar em cold start)"
fi
echo ""

# Teste 2: Frontend Vercel
echo "✓ Teste 2: Frontend (Vercel)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -L "$WEB_URL" 2>/dev/null)
if [ "$RESPONSE" = "200" ]; then
  echo "  ✅ Frontend respondendo (HTTP 200)"
else
  echo "  ❌ Frontend retornou HTTP $RESPONSE"
fi
echo ""

echo "✨ Testes concluídos!"
