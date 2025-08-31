import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import { QueueItem } from '../src/models/QueueItem';
import { queueRouter } from '../src/routes/queue';
import { Simulator } from '../src/services/Simulator';
import { errorHandler } from '../src/utils/errors';

describe('Queue API Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let simulator: Simulator;

  beforeAll(async () => {
    // Configurar MongoDB em memória
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    
    // Configurar app de teste
    app = express();
    app.use(express.json());
    
    simulator = new Simulator();
    app.use('/queue', queueRouter(simulator));
    app.use(errorHandler);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await QueueItem.deleteMany({});
  });

  describe('POST /queue/items', () => {
    it('should create a new queue item and return 201 with id', async () => {
      const payload = { orderId: 'TEST-123', sku: 'TEST-SKU' };
      const callbackUrl = 'http://localhost:3333/callback';

      const response = await request(app)
        .post('/queue/items')
        .send({ payload, callbackUrl })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('string');

      // Verificar se foi salvo no banco
      const savedItem = await QueueItem.findById(response.body.id);
      expect(savedItem).toBeTruthy();
      expect(savedItem?.payload).toEqual(payload);
      expect(savedItem?.callbackUrl).toBe(callbackUrl);
    });

    it('should return 400 when callbackUrl is missing', async () => {
      const response = await request(app)
        .post('/queue/items')
        .send({ payload: { orderId: 'TEST-123' } })
        .expect(400);

      expect(response.body.error).toBe('callbackUrl é obrigatório');
    });
  });

  describe('GET /queue/items/:id', () => {
    it('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .get(`/queue/items/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Item not found');
      expect(response.body.statusCode).toBe(404);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/queue/items/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid ID format');
      expect(response.body.statusCode).toBe(400);
    });

    it('should return item details for valid id', async () => {
      const item = await QueueItem.create({
        payload: { test: 'data' },
        callbackUrl: 'http://localhost:3333/callback',
        status: 'PENDING',
        stage: 'RECEIVED',
        progress: 0
      });

      const response = await request(app)
        .get(`/queue/items/${item.id}`)
        .expect(200);

      expect(response.body._id).toBe(item.id);
      expect(response.body.payload).toEqual({ test: 'data' });
    });
  });

  describe('GET /queue/status', () => {
    it('should return queue status with expected keys', async () => {
      const response = await request(app)
        .get('/queue/status')
        .expect(200);

      expect(response.body).toHaveProperty('processing');
      expect(response.body).toHaveProperty('queueSize');
      expect(response.body).toHaveProperty('averageItemSeconds');
      expect(response.body).toHaveProperty('currentItemEta');
    });
  });

  describe('GET /queue/items/:id/position', () => {
    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/queue/items/invalid-id/position')
        .expect(400);

      expect(response.body.error).toBe('Invalid ID format');
    });

    it('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .get(`/queue/items/${fakeId}/position`)
        .expect(404);

      expect(response.body.error).toBe('Item not found');
    });

    it('should return position for existing item', async () => {
      const item = await QueueItem.create({
        payload: { test: 'data' },
        callbackUrl: 'http://localhost:3333/callback',
        status: 'PENDING',
        stage: 'RECEIVED',
        progress: 0
      });

      const response = await request(app)
        .get(`/queue/items/${item.id}/position`)
        .expect(200);

      expect(response.body).toHaveProperty('position');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('PENDING');
    });
  });

  describe('GET /queue/items', () => {
    it('should return items with status filter', async () => {
      // Criar itens com diferentes status
      await QueueItem.create([
        {
          payload: { id: 1 },
          callbackUrl: 'http://localhost:3333/callback',
          status: 'PENDING',
          stage: 'RECEIVED',
          progress: 0
        },
        {
          payload: { id: 2 },
          callbackUrl: 'http://localhost:3333/callback',
          status: 'COMPLETED',
          stage: 'DONE',
          progress: 100
        }
      ]);

      const response = await request(app)
        .get('/queue/items?status=PENDING')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('PENDING');
    });

    it('should respect limit parameter', async () => {
      // Criar mais itens que o limite
      const items = Array.from({ length: 10 }, (_, i) => ({
        payload: { id: i },
        callbackUrl: 'http://localhost:3333/callback',
        status: 'PENDING',
        stage: 'RECEIVED',
        progress: 0
      }));

      await QueueItem.create(items);

      const response = await request(app)
        .get('/queue/items?limit=5')
        .expect(200);

      expect(response.body).toHaveLength(5);
    });
  });
});
