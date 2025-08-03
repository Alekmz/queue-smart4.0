
# Backend Node.js com MongoDB via Docker

Este projeto é um backend simples usando **Node.js (Express)** com **MongoDB**, containerizado com **Docker** e orquestrado via **Docker Compose**.

---

## Estrutura do Projeto

.
├── Dockerfile
├── docker-compose.yml
├── package.json
├── src/
│   └── index.js (ou app.js)
├── install-docker.sh
├── run.sh
└── README.md

---

## 📦 Pré-requisitos

- Uma máquina Linux (ex: Amazon EC2 rodando Amazon Linux 2)
- Acesso sudo
- Git instalado (opcional, mas recomendado)

---

## ⚙️ Instalação do Docker e Docker Compose (em EC2 Amazon Linux)

Use o script abaixo para instalar **Docker** e **Docker Compose v2 (plugin oficial)**:

### 🔧 1. Dê permissão e execute o script:

```bash
chmod +x install-docker.sh
./install-docker.sh

Após a execução, saia e entre novamente no terminal ou execute:

exec $SHELL



⸻

🚀 Subindo o Projeto com Docker

Utilize o script run.sh para derrubar containers antigos, limpar imagens e subir o backend com MongoDB:

▶️ 1. Dê permissão e execute:

chmod +x run.sh
./run.sh

Esse script executa:
	•	docker compose down -v — Para containers e remove volumes
	•	docker image prune -f — Remove imagens órfãs
	•	docker compose up --build — Sobe os serviços com rebuild

⸻

🐳 Docker Compose: Serviços

O projeto define os seguintes containers:

Serviço	Descrição	Porta Exposta
express-app	Backend Node.js/Express	3000:3000
mongo-db	Banco de dados MongoDB	27017:27017


⸻

🔗 Conexão com o MongoDB

A conexão com o MongoDB no backend deve utilizar:

mongoose.connect(process.env.MONGO_URL || 'mongodb://mongo:27017/queue');

No docker-compose.yml, a variável de ambiente já está configurada:

environment:
  - MONGO_URL=mongodb://mongo:27017/queue

⚠️ Não utilize 127.0.0.1 ou localhost dentro de containers para se conectar ao MongoDB. Use mongo que é o nome do serviço.

⸻

✅ Verificando o funcionamento

Se tudo estiver correto, você verá:

MongoDB connected
Server listening on port 3000


⸻

🧼 Parar e remover containers

Para parar e remover tudo manualmente:

docker compose down -v


⸻

🧪 Comandos úteis

Ação	Comando
Ver containers rodando	docker ps
Entrar no container do backend	docker exec -it express-app sh
Entrar no Mongo via shell	docker exec -it mongo-db mongosh
Limpar imagens órfãs	docker image prune -f
Ver logs do backend	docker logs -f express-app


⸻

🤝 Licença

Este projeto é open-source. Use livremente e modifique conforme necessário.

---
