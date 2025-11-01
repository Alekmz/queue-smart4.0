import { Schema, model, Document } from 'mongoose';

export interface EstoqueDoc extends Document {
  pos: number; // 1 a 26
  cor: string; // cor da peça
  op: string | null; // ID do pedido que está usando, ou null se disponível
  createdAt: Date;
  updatedAt: Date;
}

const EstoqueSchema = new Schema<EstoqueDoc>(
  {
    pos: {
      type: Number,
      required: true,
      min: 1,
      max: 26,
      unique: true,
      index: true,
    },
    cor: {
      type: String,
      required: true,
      index: true,
    },
    op: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Índice composto para buscar peças disponíveis por cor
EstoqueSchema.index({ cor: 1, op: 1 });

export const Estoque = model<EstoqueDoc>('Estoque', EstoqueSchema);

