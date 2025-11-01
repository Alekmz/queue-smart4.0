import axios from "axios";
import { QueueItem, QueueItemDoc } from "../models/QueueItem";
import { ItemStatus, Stage } from "../domain/enums";
import {
  STAGE_DURATIONS,
  JITTER_RATIO,
  LOOP_INTERVAL_MS,
  CALLBACK_TIMEOUT_MS,
  MAX_CALLBACK_TRIES,
} from "../config/sim";
import { withJitter } from "../utils/time";

const STAGE_FLOW: Stage[] = [
  Stage.NA_FILA,
  Stage.PRODUZINDO,
  Stage.EXPEDICAO,
  Stage.ENTREGUE,
];

const TOTAL_ITEM_SECONDS = Math.round(
  Object.values(STAGE_DURATIONS).reduce((a, b) => a + b, 0) / 1000
);

export class Simulator {
  private timer?: NodeJS.Timeout;
  private readonly nodeId = `sim-${Math.random().toString(36).slice(2, 8)}`;
  private processingId: string | null = null;
  private currentStageDeadline: number | null = null;

  start() {
    if (!this.timer) {
      this.timer = setInterval(
        () => this.tick().catch(console.error),
        LOOP_INTERVAL_MS
      );
      // eslint-disable-next-line no-console
      console.log(`[sim] started @ ${this.nodeId}`);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async getStatus() {
    const processing = this.processingId
      ? await QueueItem.findById(this.processingId).lean()
      : await QueueItem.findOne({ status: ItemStatus.PROCESSING }).lean();

    const queueSize = await QueueItem.countDocuments({
      status: ItemStatus.PENDING,
    });
    const averageItemSeconds = TOTAL_ITEM_SECONDS;
    let currentItemEta = processing?.etaSeconds ?? null;

    return { processing, queueSize, averageItemSeconds, currentItemEta };
  }

  async getPosition(id: string) {
    const item = await QueueItem.findById(id).lean();
    if (!item) return { position: null, status: "NOT_FOUND" };

    if (item.status === ItemStatus.COMPLETED)
      return { position: 0, status: item.status };
    if (item.status === ItemStatus.PROCESSING)
      return { position: 0, status: item.status };

    const ahead = await QueueItem.countDocuments({
      status: ItemStatus.PENDING,
      createdAt: { $lt: item.createdAt },
    });

    return { position: ahead + 1, status: item.status };
  }

  private async tick() {
    // Se não há item localmente, tente fazer claim do primeiro pendente
    if (!this.processingId) {
      const claimed = await this.claimNext();
      if (!claimed) return;

      // preparar primeira etapa
      await this.startStage(claimed, Stage.NA_FILA);
      this.processingId = claimed.id;
      return;
    }

    const item = await QueueItem.findById(this.processingId);
    if (!item) {
      this.processingId = null;
      this.currentStageDeadline = null;
      return;
    }

    // Verificar se o item ainda está sendo processado por este simulador
    if (
      item.status !== ItemStatus.PROCESSING ||
      item.lockedBy !== this.nodeId
    ) {
      // Item foi liberado ou está sendo processado por outro simulador
      this.processingId = null;
      this.currentStageDeadline = null;
      return;
    }

    // Se não há deadline configurado, configurar baseado na etapa atual
    if (!this.currentStageDeadline) {
      await this.startStage(item, item.stage);
      return;
    }

    // etapa concluída?
    if (Date.now() >= this.currentStageDeadline) {
      await this.advanceStage(item);
      return;
    }

    // atualizar progresso / ETA contínua
    await this.updateProgress(item);
  }

  private async claimNext(): Promise<QueueItemDoc | null> {
    // Primeiro, tentar reclamar itens que estão PROCESSING mas não têm simulador ativo
    const orphanedItem = await QueueItem.findOneAndUpdate(
      {
        status: ItemStatus.PROCESSING,
        lockedBy: { $exists: false },
      },
      {
        $set: {
          lockedBy: this.nodeId,
          lockedAt: new Date(),
        },
      },
      { new: true }
    );

    if (orphanedItem) {
      // Configurar o item órfão para continuar processamento
      this.processingId = orphanedItem.id;
      // Não configurar deadline aqui, será configurado no próximo tick
      return orphanedItem;
    }

    // Se não há itens órfãos, tentar claim de um novo PENDING
    const doc = await QueueItem.findOneAndUpdate(
      { status: ItemStatus.PENDING },
      {
        $set: {
          status: ItemStatus.PROCESSING,
          stage: Stage.NA_FILA,
          lockedAt: new Date(),
          lockedBy: this.nodeId,
          stageStartedAt: new Date(),
          history: [
            { stage: Stage.NA_FILA, startedAt: new Date(), finishedAt: null },
          ],
          etaSeconds: Math.round(
            Object.values(STAGE_DURATIONS).reduce((a, b) => a + b, 0) / 1000
          ),
          progress: 0,
        },
      },
      { sort: { createdAt: 1 }, new: true }
    );
    return doc;
  }

  private nextStage(current: Stage) {
    const idx = STAGE_FLOW.indexOf(current);
    return STAGE_FLOW[Math.min(idx + 1, STAGE_FLOW.length - 1)];
  }

  private async startStage(item: QueueItemDoc, stage: Stage) {
    const durationMs = withJitter(STAGE_DURATIONS[stage], JITTER_RATIO);
    this.currentStageDeadline = Date.now() + durationMs;

    item.stage = stage;
    item.stageStartedAt = new Date();

    // Adicionar ao histórico se não existir
    const existingHistory = item.history.find(
      (h) => h.stage === stage && !h.finishedAt
    );
    if (!existingHistory) {
      item.history.push({ stage, startedAt: new Date(), finishedAt: null });
    }

    await item.save();
  }

  private async advanceStage(item: QueueItemDoc) {
    // fechar etapa atual
    const last = item.history[item.history.length - 1];
    if (last && !last.finishedAt) last.finishedAt = new Date();

    // próxima etapa
    const next = this.nextStage(item.stage);
    if (next === Stage.ENTREGUE) {
      item.stage = Stage.ENTREGUE;
      item.status = ItemStatus.COMPLETED;
      item.progress = 100;
      item.etaSeconds = 0;
      await item.save();
      await this.tryCallback(item);
      // liberar loop
      this.processingId = null;
      this.currentStageDeadline = null;
      return;
    }

    await item.save(); // persistir fechamento da etapa
    await this.startStage(item, next);
    await this.updateProgress(item);
  }

  private async updateProgress(item: QueueItemDoc) {
    const totalMs = Object.values(STAGE_DURATIONS).reduce((a, b) => a + b, 0);
    const elapsedMs = item.history.reduce((sum, h) => {
      const end = h.finishedAt
        ? h.finishedAt.getTime()
        : h.stage === item.stage
        ? Date.now()
        : 0;
      const start = h.startedAt?.getTime?.() ?? 0;
      return sum + Math.max(0, end - start);
    }, 0);

    item.progress = Math.min(99, Math.floor((elapsedMs / totalMs) * 100));
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    item.etaSeconds = Math.round(remainingMs / 1000);
    await item.save();
  }

  private async tryCallback(item: QueueItemDoc) {
    if (!item.callbackUrl) return;
    if (item.lastCallbackAt) return; // idempotência simples

    try {
      await axios.post(
        item.callbackUrl,
        {
          id: item.id,
          status: item.status,
          stage: item.stage,
          finishedAt: new Date().toISOString(),
          history: item.history,
          payload: item.payload ?? null,
        },
        { timeout: CALLBACK_TIMEOUT_MS }
      );
      item.lastCallbackAt = new Date();
      await item.save();
    } catch (err) {
      item.callbackTries = (item.callbackTries ?? 0) + 1;
      await item.save();
      if (item.callbackTries < MAX_CALLBACK_TRIES) {
        // backoff simples: reabrir última etapa DONE por alguns segundos e tentar novamente no próximo loop
        this.currentStageDeadline = Date.now() + 5000;
      }
    }
  }
}
