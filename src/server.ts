import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { setupSwagger } from './swagger';
import { queueRouter } from './routes/queue';
import healthRouter from './routes/health';
import { errorHandler } from './utils/errors';
import { Simulator } from './services/Simulator';

const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Swagger
setupSwagger(app);

// Rotas de sistema (deve vir ANTES das rotas específicas para evitar conflitos)
app.use('/health', healthRouter);

// Simulador e rotas de fila
const simulator = new Simulator();
app.use('/queue', queueRouter(simulator));

// Middleware de erro (deve ser o último)
app.use(errorHandler);

// Conexão MongoDB e inicialização
async function startServer() {
  try {
    await mongoose.connect(config.mongoUrl, config.mongoOptions);
    console.log('✅ MongoDB conectado com sucesso');

    // Iniciar simulador após conexão com MongoDB
    simulator.start();
    console.log('🚀 Simulador iniciado');

    app.listen(config.port, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${config.port}`);
      console.log(`📚 Swagger disponível em http://localhost:${config.port}/docs`);
      console.log(`📄 OpenAPI YAML em http://localhost:${config.port}/openapi.yaml`);
    });
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando...');
  simulator.stop();
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando...');
  simulator.stop();
  mongoose.connection.close();
  process.exit(0);
});

startServer();
