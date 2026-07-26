import type { RaceControl } from '../types/f1';

export type Neutralisation = 'red' | 'sc' | 'vsc' | null;

/**
 * Current neutralisation state, from the most recent relevant race-control
 * message. Scanning the whole history would latch on the first deployment and
 * never clear when the track goes green again.
 */
export function currentNeutralisation(raceControl: RaceControl[]): Neutralisation {
  for (let i = raceControl.length - 1; i >= 0; i--) {
    const msg = raceControl[i].message.toLowerCase();
    if (msg.includes('red flag')) return 'red';
    if (msg.includes('virtual safety car')) {
      return msg.includes('ending') || msg.includes('deleted') ? null : 'vsc';
    }
    if (msg.includes('safety car')) {
      return msg.includes('in this lap') || msg.includes('returning') ? null : 'sc';
    }
    if (msg.includes('track clear') || msg.includes('green light') || msg.includes('green flag')) {
      return null;
    }
  }
  return null;
}

export const NEUTRALISATION_LABEL: Record<Exclude<Neutralisation, null>, string> = {
  red: '🚩 RED FLAG',
  sc: '🚗 SAFETY CAR',
  vsc: '🚗 VSC',
};

export const NEUTRALISATION_COLOR: Record<Exclude<Neutralisation, null>, string> = {
  red: '#dc2626',
  sc: '#d97706',
  vsc: '#d97706',
};
