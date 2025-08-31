import { Schema, model, Document } from 'mongoose';
import { ItemStatus, Stage } from '../domain/enums';

type StageHistory = {
  stage: Stage;
  startedAt: Date;
  finishedAt?: Date | null;
};

export interface QueueItemDoc extends Document {
  payload: any;
  callbackUrl: string;
  status: ItemStatus;
  stage: Stage;
  progress: number;              // 0..100
  etaSeconds?: number | null;    // estimativa para o item atual
  lockedAt?: Date | null;
  lockedBy?: string | null;
  stageStartedAt?: Date | null;
  history: StageHistory[];
  lastCallbackAt?: Date | null;
  createdAt: Date; // Added createdAt field
  callbackTries?: number;
}

const StageHistorySchema = new Schema<StageHistory>(
  {
    stage: { type: String, enum: Object.values(Stage), required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
  },
  { _id: false }
);

const QueueItemSchema = new Schema<QueueItemDoc>(
  {
    payload: { type: Schema.Types.Mixed },
    callbackUrl: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ItemStatus),
      default: ItemStatus.PENDING,
      index: true,
    },
    stage: {
      type: String,
      enum: Object.values(Stage),
      default: Stage.RECEIVED,
    },
    progress: { type: Number, default: 0 },
    etaSeconds: { type: Number, default: null },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null },
    stageStartedAt: { type: Date, default: null },
    history: { type: [StageHistorySchema], default: [] },
    lastCallbackAt: { type: Date, default: null },
    callbackTries: { type: Number, default: 0 },
  },
  { timestamps: true }
);

QueueItemSchema.index({ status: 1, createdAt: 1 }); // para claim ordenado

export const QueueItem = model<QueueItemDoc>('QueueItem', QueueItemSchema);