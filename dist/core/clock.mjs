// Map wall time to historical time. Only the clock is interpolated, never prices.
export function advanceClock(clock, account, tape, seconds, speed, compress, step) {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(speed) || speed <= 0) throw Error('Invalid clock advance');
  let budget = seconds;
  while (!account.done) {
    const next = tape[account.index + 1];
    if (!next) { step(account, tape); break; }
    const previous = tape[account.index][0];
    const interval = (next[0] - previous) / 1000;
    if (interval < 0) throw Error('Out-of-order market tape');
    const wallInterval = compress ? Math.min(interval / speed, 2) : interval / speed;
    const rate = interval === 0 ? speed : interval / wallInterval;
    const remaining = (next[0] - clock.time) / 1000 / rate;
    if (remaining > budget + 1e-10) { clock.time += budget * rate * 1000; break; }
    budget = Math.max(0, budget - Math.max(remaining, 0));
    clock.time = next[0];
    step(account, tape);
    if (account.done) break;
  }
  return clock.time;
}
