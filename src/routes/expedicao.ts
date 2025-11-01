import { Router } from 'express';
import mongoose from 'mongoose';
import { QueueItem } from '../models/QueueItem';
import { Estoque } from '../models/Estoque';
import { Stage, ItemStatus } from '../domain/enums';

export const expedicaoRouter = Router();

// GET /expedicao - listar todos os itens em expedição
expedicaoRouter.get('/', async (req, res, next) => {
  try {
    const items = await QueueItem.find({
      stage: Stage.EXPEDICAO,
    })
      .select('_id estoquePos')
      .lean();

    const formatted = items.map((item) => ({
      pos: item.estoquePos,
      op: item._id.toString(),
    }));

    return res.json(formatted);
  } catch (e) {
    return next(e);
  }
});

// POST /expedicao/:pos/liberar - liberar posição de expedição
expedicaoRouter.post('/:pos/liberar', async (req, res, next) => {
  try {
    const { pos } = req.params;
    const posNum = Number.parseInt(pos, 10);

    if (!posNum || posNum < 1 || posNum > 26) {
      return res.status(400).json({
        error: 'Posição inválida. Deve ser um número entre 1 e 26',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }

    // Encontrar item em expedição com essa posição
    const item = await QueueItem.findOne({
      estoquePos: posNum,
      stage: Stage.EXPEDICAO,
    });

    if (!item) {
      return res.status(404).json({
        error: 'Nenhum item em expedição encontrado para esta posição',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }

    // Avançar para ENTREGUE e marcar como COMPLETED
    item.stage = Stage.ENTREGUE;
    item.status = ItemStatus.COMPLETED;
    item.progress = 100;
    await item.save();

    // Liberar posição do estoque (cor e op null)
    await Estoque.findOneAndUpdate({ pos: posNum }, { cor: null, op: null });

    return res.json({
      message: 'Posição liberada com sucesso',
      pos: posNum,
      op: item._id.toString(),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return next(e);
  }
});

// Alternativa: DELETE /expedicao/:op - liberar por OP (ID do pedido)
expedicaoRouter.delete('/:op', async (req, res, next) => {
  try {
    const { op } = req.params;

    if (!mongoose.Types.ObjectId.isValid(op)) {
      return res.status(400).json({
        error: 'ID inválido',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }

    const item = await QueueItem.findById(op);

    if (!item) {
      return res.status(404).json({
        error: 'Item não encontrado',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }

    if (item.stage !== Stage.EXPEDICAO) {
      return res.status(400).json({
        error: 'Item não está em expedição',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }

    // Avançar para ENTREGUE e marcar como COMPLETED
    item.stage = Stage.ENTREGUE;
    item.status = ItemStatus.COMPLETED;
    item.progress = 100;
    await item.save();

    // Liberar posição do estoque se houver (cor e op null)
    if (item.estoquePos) {
      await Estoque.findOneAndUpdate({ pos: item.estoquePos }, { cor: null, op: null });
    }

    return res.json({
      message: 'Item liberado da expedição com sucesso',
      pos: item.estoquePos,
      op: item._id.toString(),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return next(e);
  }
});

