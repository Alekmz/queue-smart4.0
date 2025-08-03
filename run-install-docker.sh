#!/bin/bash

set -e

echo "🔍 Atualizando pacotes..."
sudo apt update && sudo apt upgrade -y

echo "🐳 Instalando dependências..."
sudo apt install -y ca-certificates curl gnupg lsb-release

echo "🔐 Adicionando chave GPG oficial do Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "📦 Adicionando repositório do Docker..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "🔄 Atualizando pacotes novamente..."
sudo apt update

echo "🐳 Instalando Docker Engine e Docker Compose plugin..."
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "🔧 Iniciando e habilitando Docker..."
sudo systemctl start docker
sudo systemctl enable docker

echo "👤 Adicionando usuário atual ao grupo docker..."
sudo usermod -aG docker $USER

echo "✅ Verificações..."
docker --version
docker compose version

echo ""
echo "✅ Docker e Docker Compose foram instalados com sucesso!"
echo "⚠️ Saia e entre novamente no terminal ou rode: exec \$SHELL"