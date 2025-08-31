export const withJitter = (baseMs: number, ratio = 0.15) => {
    const delta = baseMs * ratio;
    return Math.round(baseMs + (Math.random() * 2 - 1) * delta);
  };