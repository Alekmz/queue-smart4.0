import { Stage } from '../domain/enums';

const isTest = process.env.NODE_ENV === 'test';

// tempos em milissegundos (adaptavel aqui :p)
export const STAGE_DURATIONS: Record<Stage, number> = {
  [Stage.RECEIVED]: isTest ? 100 : 1000,
  [Stage.PICKING]: isTest ? 200 : 5000,
  [Stage.ASSEMBLY]: isTest ? 300 : 10000,
  [Stage.QA]: isTest ? 150 : 4000,
  [Stage.PACKING]: isTest ? 100 : 3000,
  [Stage.EXPEDITION]: isTest ? 100 : 2000,
  [Stage.DONE]: 0,
};

export const JITTER_RATIO = isTest ? 0.05 : 0.15; // +/- 5% em teste, 15% em produção
export const LOOP_INTERVAL_MS = isTest ? 100 : 1000; // loop mais rápido em teste
export const CALLBACK_TIMEOUT_MS = isTest ? 1000 : 5000;
export const MAX_CALLBACK_TRIES = 3;