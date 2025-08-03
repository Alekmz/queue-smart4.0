#!/bin/bash

set -e

echo "🔍 Atualizando pacotes..."
sudo yum update -y

echo "🐳 Instalando Docker..."
sudo amazon-linux-extras enable docker
sudo yum install -y docker

echo "🔧 Iniciando e habilitando Docker..."
sudo systemctl start docker
sudo systemctl enable docker

echo "👤 Adicionando usuário atual ao grupo docker..."
sudo usermod -aG docker $USER

echo "📦 Instalando Docker Compose v2 (plugin)..."
DOCKER_COMPOSE_VERSION="v2.27.0" # última versão estável conhecida em jul/2025
sudo curl -SL https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo "✅ Verificações..."
docker --version
docker compose version

echo ""
echo "✅ Docker e Docker Compose foram instalados com sucesso!"
echo "⚠️ Saia e entre novamente no terminal ou rode: exec \$SHELL"