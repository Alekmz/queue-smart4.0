import { Router } from 'express';
import mongoose from 'mongoose';
import { QueueItem } from '../models/QueueItem';
import { ItemStatus, Stage } from '../domain/enums';
import { Simulator } from '../services/Simulator';
import { resetSimulator, getSimulatorStatus } from '../utils/resetSimulator';

export const queueRouter = (sim: Simulator) => {
  const router = Router();

  // POST /items – enfileira novo produto (com callback)
  router.post('/items', async (req, res, next) => {
    try {
      const { payload, callbackUrl } = req.body;
      if (!callbackUrl) {
        return res.status(400).json({ error: 'callbackUrl é obrigatório' });
      }

      const item = await QueueItem.create({
        payload: payload ?? null,
        callbackUrl,
        status: ItemStatus.PENDING,
        stage: Stage.RECEIVED,
        progress: 0,
      });

      return res.status(201).json({ id: item.id });
    } catch (e) { 
      return next(e); 
    }
  });

  // GET /status – visão geral da "bancada"
  router.get('/status', async (_req, res, next) => {
    try {
      const status = await sim.getStatus();
      return res.json(status);
    } catch (e) { 
      return next(e); 
    }
  });

  // GET /status/detailed – status detalhado do simulador
  router.get('/status/detailed', async (_req, res, next) => {
    try {
      const detailedStatus = await getSimulatorStatus();
      return res.json(detailedStatus);
    } catch (e) { 
      return next(e); 
    }
  });

  // POST /reset – resetar simulador (para desenvolvimento/testes)
  router.post('/reset', async (_req, res, next) => {
    try {
      const resetCount = await resetSimulator();
      return res.json({ 
        message: 'Simulador resetado com sucesso',
        resetCount,
        timestamp: new Date().toISOString()
      });
    } catch (e) { 
      return next(e); 
    }
  });

  // GET /items/:id – detalhes do item
  router.get('/items/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Validar ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          error: 'Invalid ID format',
          statusCode: 400,
          timestamp: new Date().toISOString()
        });
      }

      const item = await QueueItem.findById(id).lean();
      if (!item) {
        return res.status(404).json({ 
          error: 'Item not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.json(item);
    } catch (e) { 
      return next(e); 
    }
  });

  // GET /items/:id/position – posição na fila (1 = próximo a executar)
  router.get('/items/:id/position', async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Validar ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          error: 'Invalid ID format',
          statusCode: 400,
          timestamp: new Date().toISOString()
        });
      }

      const pos = await sim.getPosition(id);
      if (pos.position === null && pos.status === 'NOT_FOUND') {
        return res.status(404).json({ 
          error: 'Item not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.json(pos);
    } catch (e) { 
      return next(e); 
    }
  });

  // GET /items – listagem com filtros simples
  router.get('/items', async (req, res, next) => {
    try {
      const { status, limit = 50, order = 'oldest' } = req.query;
      const query: any = {};
      
      if (status) {
        if (Object.values(ItemStatus).includes(status as ItemStatus)) {
          query.status = status;
        } else {
          return res.status(400).json({ 
            error: 'Invalid status value',
            statusCode: 400,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Validar parâmetro de ordenação
      const validOrders = ['oldest', 'newest'];
      if (!validOrders.includes(order as string)) {
        return res.status(400).json({ 
          error: 'Invalid order value. Use "oldest" or "newest"',
          statusCode: 400,
          timestamp: new Date().toISOString()
        });
      }
      
      const limitNum = Math.min(Math.max(Number(limit) || 50, 1), 100);
      
      // Definir ordenação baseada no parâmetro order
      const sortOrder = order === 'newest' ? -1 : 1; // -1 para mais recentes primeiro, 1 para mais antigos primeiro
      
      const items = await QueueItem.find(query)
        .sort({ createdAt: sortOrder })
        .limit(limitNum)
        .lean();
      
      return res.json({
        items,
        total: items.length,
        order: order,
        limit: limitNum,
        timestamp: new Date().toISOString()
      });
    } catch (e) { 
      return next(e); 
    }
  });

  // DELETE /items – limpar todos os itens do banco de dados
  router.delete('/items', async (req, res, next) => {
    try {
      const result = await QueueItem.deleteMany({});
      
      return res.json({
        message: 'Banco de dados limpo com sucesso',
        deletedCount: result.deletedCount,
        timestamp: new Date().toISOString()
      });
    } catch (e) { 
      return next(e); 
    }
  });

  return router;
};
