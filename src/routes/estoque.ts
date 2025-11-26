import { Router } from 'express';
import mongoose from 'mongoose';
import { Estoque } from '../models/Estoque';
import { QueueItem } from '../models/QueueItem';

export const estoqueRouter = Router();

// GET /estoque - listar todos os estoques
estoqueRouter.get('/', async (req, res, next) => {
  try {
    const { color } = req.query;
    const query: any = {};

    // Se foi passado parâmetro color, filtrar por cor disponível
    if (color) {
      query.cor = color;
      query.op = null; // apenas disponíveis
    }

    const items = await Estoque.find(query)
      .sort({ pos: 1 })
      .lean();

    const formatted = items.map((item) => ({
      pos: item.pos,
      cor: item.cor,
      op: item.op,
    }));

    return res.json(formatted);
  } catch (e) {
    return next(e);
  }
});

// GET /estoque/:pos - obter estoque por posição
estoqueRouter.get('/:pos', async (req, res, next) => {
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

    const item = await Estoque.findOne({ pos: posNum }).lean();

    if (!item) {
      return res.status(404).json({
        error: 'Posição não encontrada',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      pos: item.pos,
      cor: item.cor,
      op: item.op,
    });
  } catch (e) {
    return next(e);
  }
});

// GET /estoque?color=xxx - obter estoques disponíveis por cor (já implementado no GET /)
// O parâmetro color no query já é tratado no GET / acima

// PUT /estoque/:pos - atualizar ou criar posição (adicionar matéria prima manualmente)
estoqueRouter.put('/:pos', async (req, res, next) => {
  try {
    const { pos } = req.params;
    const { cor, op } = req.body;
    const posNum = Number.parseInt(pos, 10);

    if (!posNum || posNum < 1 || posNum > 26) {
      return res.status(400).json({
        error: 'Posição inválida. Deve ser um número entre 1 e 26',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }

    if (!cor || typeof cor !== 'string') {
      return res.status(400).json({
        error: 'Cor é obrigatória',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar se a posição está em uso (se tentar mudar cor de uma posição em uso)
    const existing = await Estoque.findOne({ pos: posNum });
    if (existing && existing.op) {
      return res.status(409).json({
        error: 'Posição está em uso por um pedido. Libere a posição primeiro.',
        statusCode: 409,
        timestamp: new Date().toISOString(),
      });
    }

    // Se op foi informado, validar que é um pedido válido
    let opValidado: string | null = null;
    if (op !== undefined && op !== null) {
      // Validar se é um ObjectId válido
      if (!mongoose.Types.ObjectId.isValid(op)) {
        return res.status(400).json({
          error: 'OP inválido. Deve ser um ID de pedido válido',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
      }

      // Verificar se o pedido existe
      const pedido = await QueueItem.findById(op);
      if (!pedido) {
        return res.status(404).json({
          error: 'Pedido não encontrado',
          statusCode: 404,
          timestamp: new Date().toISOString(),
        });
      }

      opValidado = op;
    }

    // Upsert: criar ou atualizar
    // Se op não foi informado, mantém null (usuário cadastra peça disponível)
    const item = await Estoque.findOneAndUpdate(
      { pos: posNum },
      { 
        cor, 
        op: opValidado !== null ? opValidado : null 
      },
      { upsert: true, new: true }
    ).lean();

    // Se vinculou um pedido, atualizar o pedido com a posição do estoque
    if (opValidado !== null) {
      await QueueItem.findByIdAndUpdate(opValidado, { estoquePos: posNum });
    }

    return res.json({
      pos: item.pos,
      cor: item.cor,
      op: item.op,
    });
  } catch (e) {
    return next(e);
  }
});

// DELETE /estoque/:pos - liberar posição (remove cor e op, deixa null)
estoqueRouter.delete('/:pos', async (req, res, next) => {
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

    const item = await Estoque.findOneAndUpdate(
      { pos: posNum },
      { cor: null, op: null }, // liberar posição (cor e op null)
      { new: true }
    ).lean();

    if (!item) {
      return res.status(404).json({
        error: 'Posição não encontrada',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      message: 'Posição liberada com sucesso',
      pos: item.pos,
      cor: item.cor,
      op: item.op,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return next(e);
  }
});

