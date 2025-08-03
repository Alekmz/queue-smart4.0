#!/bin/bash

echo "🛑 Parando containers existentes..."
docker compose down -v

echo "🧹 Limpando imagens antigas (opcional)..."
docker image prune -f

echo "🔧 Construindo e subindo containers..."
docker compose up --build