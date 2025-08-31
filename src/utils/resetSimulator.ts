import { QueueItem } from '../models/QueueItem';
import { ItemStatus, Stage } from '../domain/enums';

export async function resetSimulator() {
  try {
    // Resetar itens que estão PROCESSING para PENDING
    const result = await QueueItem.updateMany(
      { status: ItemStatus.PROCESSING },
      {
        $set: {
          status: ItemStatus.PENDING,
          stage: Stage.RECEIVED,
          progress: 0,
          etaSeconds: null
        },
        $unset: {
          lockedAt: "",
          lockedBy: "",
          stageStartedAt: ""
        }
      }
    );

    console.log(`✅ Resetados ${result.modifiedCount} itens de PROCESSING para PENDING`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Erro ao resetar simulador:', error);
    throw error;
  }
}

export async function getSimulatorStatus() {
  try {
    const pending = await QueueItem.countDocuments({ status: ItemStatus.PENDING });
    const processing = await QueueItem.countDocuments({ status: ItemStatus.PROCESSING });
    const completed = await QueueItem.countDocuments({ status: ItemStatus.COMPLETED });
    const failed = await QueueItem.countDocuments({ status: ItemStatus.FAILED });

    const processingItems = await QueueItem.find({ status: ItemStatus.PROCESSING })
      .select('_id stage progress lockedBy lockedAt createdAt')
      .lean();

    return {
      counts: { pending, processing, completed, failed },
      processingItems
    };
  } catch (error) {
    console.error('❌ Erro ao obter status:', error);
    throw error;
  }
}
