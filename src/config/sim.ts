import { Stage } from '../domain/enums';

const isTest = process.env.NODE_ENV === 'test';

// tempos em milissegundos (adaptavel aqui :p)
export const STAGE_DURATIONS: Record<Stage, number> = {
  [Stage.NA_FILA]: 0,
  [Stage.PRODUZINDO]: 60000,
  [Stage.EXPEDICAO]: 0,
  [Stage.ENTREGUE]: 0,
};

export const JITTER_RATIO = isTest ? 0.05 : 0.15; // +/- 5% em teste, 15% em produção
export const LOOP_INTERVAL_MS = isTest ? 100 : 1000; // loop mais rápido em teste
export const CALLBACK_TIMEOUT_MS = isTest ? 1000 : 5000;
export const MAX_CALLBACK_TRIES = 3;