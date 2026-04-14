#!/bin/bash

# Script para configurar RAILWAY_TOKEN no GitHub Secrets
# Uso: ./configure-railway-secret.sh <RAILWAY_TOKEN>

RAILWAY_TOKEN="${1:-03fffa2f-c5d9-4c52-8a8c-93ab7048336c}"
REPO="tenangelo/Zeus-Financeiro"

echo "🚀 Configurando RAILWAY_TOKEN no GitHub..."
echo "Repository: $REPO"
echo "Token: ${RAILWAY_TOKEN:0:10}..." # Mostra só os primeiros 10 chars

# Método 1: Tentar com gh CLI se disponível
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI encontrado. Configurando secret..."
    gh secret set RAILWAY_TOKEN --body "$RAILWAY_TOKEN" -R "$REPO"

    if [ $? -eq 0 ]; then
        echo "✅ Secret RAILWAY_TOKEN configurado com sucesso!"
        echo "💡 O GitHub Actions começará a fazer deploy no Railway automaticamente."
        exit 0
    fi
fi

# Método 2: Instruções manuais
echo ""
echo "❌ GitHub CLI não encontrado."
echo ""
echo "📋 Instruções para configurar manualmente:"
echo ""
echo "1. Acesse: https://github.com/tenangelo/Zeus-Financeiro/settings/secrets/actions"
echo "2. Clique em 'New repository secret'"
echo "3. Nome: RAILWAY_TOKEN"
echo "4. Value: $RAILWAY_TOKEN"
echo "5. Clique em 'Add secret'"
echo ""
echo "Depois, o deploy do Railway começará automaticamente no próximo push."
