import { useRef, useCallback } from 'react';
import type { CarData, ERSState } from '../types/f1';

const INITIAL_CHARGE = 80;
const DEPLOY_RATE = 1.8;   // % per update when deploying
const HARVEST_RATE = 1.2;  // % per update when harvesting
const DECAY_RATE = 0.15;   // % passive drain per update
const MAX_MJ = 4.0;        // MJ capacity

function classifyMode(throttle: number, brake: number, prevSpeed: number, speed: number): ERSState['mode'] {
  const accelerating = speed > prevSpeed + 2;
  if (throttle > 95 && accelerating) return 'Boost';
  if (throttle < 20 || brake > 50) return 'Harvest';
  if (throttle > 60 && !accelerating) return 'Depleting';
  return 'Balanced';
}

export function useErsEstimator() {
  const stateRef = useRef<Map<number, ERSState & { prevSpeed: number }>>(new Map());

  const update = useCallback((carDataList: CarData[]): { [driverNumber: number]: ERSState } => {
    const result: { [driverNumber: number]: ERSState } = {};

    for (const cd of carDataList) {
      const prev = stateRef.current.get(cd.driver_number) ?? {
        charge: INITIAL_CHARGE,
        mode: 'Balanced' as const,
        estimatedMJ: (INITIAL_CHARGE / 100) * MAX_MJ,
        prevSpeed: cd.speed,
      };

      const mode = classifyMode(cd.throttle, cd.brake, prev.prevSpeed, cd.speed);

      let charge = prev.charge;
      if (mode === 'Boost') {
        charge -= DEPLOY_RATE;
      } else if (mode === 'Harvest') {
        charge += HARVEST_RATE;
      } else if (mode === 'Depleting') {
        charge -= DECAY_RATE * 2;
      } else {
        charge -= DECAY_RATE;
      }
      charge = Math.max(0, Math.min(100, charge));

      const next = { charge, mode, estimatedMJ: (charge / 100) * MAX_MJ, prevSpeed: cd.speed };
      stateRef.current.set(cd.driver_number, next);
      result[cd.driver_number] = { charge, mode, estimatedMJ: next.estimatedMJ };
    }

    return result;
  }, []);

  return { update };
}
