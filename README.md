
# Queue Smart 4.0

Sistema inteligente de gerenciamento de filas com simulação de processos industriais em tempo real.

## 🚀 Tecnologias

- **Backend**: Node.js + Express + TypeScript
- **Banco de Dados**: MongoDB
- **Containerização**: Docker + Docker Compose
- **Documentação**: OpenAPI 3.0 + Swagger UI
- **Testes**: Jest + Supertest + MongoDB Memory Server

## 📁 Arquitetura

```
src/
├── config/          # Configurações (ambiente, simulação)
├── domain/          # Enums e tipos de domínio
├── models/          # Modelos MongoDB
├── routes/          # Rotas da API
├── services/        # Lógica de negócio (Simulator)
├── utils/           # Utilitários (tempo, erros)
├── server.ts        # Servidor principal
└── swagger.ts       # Configuração Swagger

openapi/
└── queue.yaml       # Especificação OpenAPI consolidada
```

## 🏃‍♂️ Como executar

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Construir para produção
npm run build

# Executar produção
npm start
```

### Docker

```bash
# Subir com Docker Compose
docker-compose up -d

# Ver logs
docker-compose logs -f backend
```

## 📚 Documentação da API

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI YAML**: http://localhost:3000/openapi.yaml

## 🔌 Endpoints Principais

### Health Check
```bash
GET /health
```

### Fila de Processamento

#### Enfileirar item
```bash
curl -X POST http://localhost:3000/queue/items \
  -H 'Content-Type: application/json' \
  -d '{
    "payload": {"orderId":"ABC-123","sku":"KIT-01"},
    "callbackUrl":"http://localhost:3333/callback"
  }'
```

#### Consultar status geral
```bash
curl http://localhost:3000/queue/status
```

#### Listar itens
```bash
curl "http://localhost:3000/queue/items?status=PENDING&limit=10"
```

#### Detalhes de um item
```bash
curl http://localhost:3000/queue/items/<ID>
```

#### Posição na fila
```bash
curl http://localhost:3000/queue/items/<ID>/position
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
PORT=3000                           # Porta do servidor
MONGO_URL=mongodb://mongo:27017/queue  # URL do MongoDB
NODE_ENV=development               # Ambiente (dev/test/prod)
```

### Configuração de Simulação

Os tempos de processamento podem ser ajustados em `src/config/sim.ts`:

- **RECEIVED**: 1s
- **PICKING**: 5s  
- **ASSEMBLY**: 10s
- **QA**: 4s
- **PACKING**: 3s
- **EXPEDITION**: 2s

Em ambiente de teste (`NODE_ENV=test`), os tempos são reduzidos para acelerar os testes.

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Modo watch
npm run test:watch

# Com cobertura
npm run test:coverage
```

### Tipos de Teste

- **Testes de Integração**: Endpoints da API
- **Testes de Simulação**: Motor de processamento
- **Validação**: ObjectId, status codes, respostas

## 🔄 Motor de Simulação

O simulador processa itens automaticamente através de 7 etapas:

1. **RECEIVED** → Item recebido
2. **PICKING** → Coleta de materiais
3. **ASSEMBLY** → Montagem
4. **QA** → Controle de qualidade
5. **PACKING** → Embalagem
6. **EXPEDITION** → Expedição
7. **DONE** → Concluído

### Características

- ✅ **Loop único e seguro** - Apenas uma instância por processo
- ✅ **Claim automático** - Processa primeiro item PENDING por `createdAt`
- ✅ **Progresso em tempo real** - Atualiza `progress` e `etaSeconds`
- ✅ **Callback automático** - Notifica `callbackUrl` ao finalizar
- ✅ **Retry com backoff** - Re-tenta callback em caso de falha

## 🐛 Troubleshooting

### Simulador não inicia
- Verificar conexão MongoDB
- Checar logs do servidor
- Confirmar que `sim.start()` é chamado após conexão

### GET por ID retorna 500
- Validar formato do ObjectId (24 caracteres hex)
- Verificar se o item existe no banco
- Checar logs de erro

### Item não avança nas etapas
- Verificar se o simulador está rodando
- Confirmar que há apenas uma instância
- Checar logs de processamento

## 📝 Licença

ISC License



