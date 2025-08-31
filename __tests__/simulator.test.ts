import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { QueueItem } from '../src/models/QueueItem';
import { Simulator } from '../src/services/Simulator';
import { ItemStatus, Stage } from '../src/domain/enums';

describe('Simulator Tests', () => {
  let mongoServer: MongoMemoryServer;
  let simulator: Simulator;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await QueueItem.deleteMany({});
    simulator = new Simulator();
  });

  afterEach(() => {
    simulator.stop();
  });

  it('should process item through multiple stages', async () => {
    // Criar item
    const item = await QueueItem.create({
      payload: { orderId: 'SIM-TEST-001' },
      callbackUrl: 'http://localhost:3333/callback',
      status: ItemStatus.PENDING,
      stage: Stage.RECEIVED,
      progress: 0
    });

    // Iniciar simulador
    simulator.start();

    // Aguardar processamento por um tempo razoável
    const maxWaitTime = 10000; // 10 segundos
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const currentItem = await QueueItem.findById(item.id);
      if (currentItem?.stage !== Stage.RECEIVED) {
        break; // Item avançou pelo menos uma etapa
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Verificar que o item avançou pelo menos uma etapa
    const finalItem = await QueueItem.findById(item.id);
    expect(finalItem).toBeTruthy();
    expect(finalItem?.stage).not.toBe(Stage.RECEIVED);
    expect(finalItem?.progress).toBeGreaterThan(0);

    // Verificar histórico
    expect(finalItem?.history.length).toBeGreaterThanOrEqual(1);
    expect(finalItem?.history[0].stage).toBe(Stage.RECEIVED);
  }, 15000);

  it('should claim next pending item correctly', async () => {
    // Criar múltiplos itens
    const items = await QueueItem.create([
      {
        payload: { id: 1 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.PENDING,
        stage: Stage.RECEIVED,
        progress: 0,
        createdAt: new Date(Date.now() - 1000) // Mais antigo
      },
      {
        payload: { id: 2 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.PENDING,
        stage: Stage.RECEIVED,
        progress: 0,
        createdAt: new Date() // Mais recente
      }
    ]);

    // Iniciar simulador
    simulator.start();

    // Aguardar um pouco para o claim
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verificar que o primeiro item foi processado
    const firstItem = await QueueItem.findById(items[0].id);
    const secondItem = await QueueItem.findById(items[1].id);

    expect(firstItem?.status).toBe(ItemStatus.PROCESSING);
    expect(firstItem?.lockedBy).toBeTruthy();
    expect(secondItem?.status).toBe(ItemStatus.PENDING);
  });

  it('should calculate position correctly', async () => {
    // Criar itens com diferentes status
    const [pending1, pending2, processing, completed] = await QueueItem.create([
      {
        payload: { id: 1 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.PENDING,
        stage: Stage.RECEIVED,
        progress: 0,
        createdAt: new Date(Date.now() - 2000)
      },
      {
        payload: { id: 2 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.PENDING,
        stage: Stage.RECEIVED,
        progress: 0,
        createdAt: new Date(Date.now() - 1000)
      },
      {
        payload: { id: 3 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.PROCESSING,
        stage: Stage.ASSEMBLY,
        progress: 50,
        createdAt: new Date(Date.now() - 3000)
      },
      {
        payload: { id: 4 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.COMPLETED,
        stage: Stage.DONE,
        progress: 100,
        createdAt: new Date(Date.now() - 4000)
      }
    ]);

    // Verificar posições
    const pos1 = await simulator.getPosition(pending1.id);
    const pos2 = await simulator.getPosition(pending2.id);
    const pos3 = await simulator.getPosition(processing.id);
    const pos4 = await simulator.getPosition(completed.id);

    expect(pos1.position).toBe(1); // Primeiro na fila
    expect(pos2.position).toBe(2); // Segundo na fila
    expect(pos3.position).toBe(0); // Processando
    expect(pos4.position).toBe(0); // Concluído
  });

  it('should return correct status information', async () => {
    // Criar itens
    await QueueItem.create([
      {
        payload: { id: 1 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.PROCESSING,
        stage: Stage.ASSEMBLY,
        progress: 30,
        etaSeconds: 45
      },
      {
        payload: { id: 2 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.PENDING,
        stage: Stage.RECEIVED,
        progress: 0
      },
      {
        payload: { id: 3 },
        callbackUrl: 'http://localhost:3333/callback',
        status: ItemStatus.PENDING,
        stage: Stage.RECEIVED,
        progress: 0
      }
    ]);

    const status = await simulator.getStatus();

    expect(status).toHaveProperty('processing');
    expect(status).toHaveProperty('queueSize');
    expect(status).toHaveProperty('averageItemSeconds');
    expect(status).toHaveProperty('currentItemEta');
    
    expect(status.queueSize).toBe(2);
    expect(status.processing).toBeTruthy();
    expect(status.processing?.stage).toBe(Stage.ASSEMBLY);
  });
});
