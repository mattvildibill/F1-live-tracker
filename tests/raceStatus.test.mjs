import test from 'node:test';
import assert from 'node:assert/strict';
import { currentNeutralisation } from '../src/utils/raceStatus.ts';
const messages = (...list) => list.map(message => ({ message }));
test('chequered flag is not a red flag', () => {
 assert.equal(currentNeutralisation(messages('CHEQUERED FLAG — RACE COMPLETE')), null);
 assert.equal(currentNeutralisation(messages('RED FLAG', 'CHEQUERED FLAG — RACE COMPLETE')), null);
 assert.equal(currentNeutralisation(messages('RED FLAG', 'CHECKERED FLAG')), null);
});
test('real red flags still stop the race', () => {
 assert.equal(currentNeutralisation(messages('RED FLAG — SESSION SUSPENDED')), 'red');
 assert.equal(currentNeutralisation(messages('RED FLAG', 'GREEN FLAG')), null);
});
test('neutralisation clears when safety cars return', () => {
 assert.equal(currentNeutralisation(messages('VIRTUAL SAFETY CAR DEPLOYED')), 'vsc');
 assert.equal(currentNeutralisation(messages('VIRTUAL SAFETY CAR DEPLOYED', 'VIRTUAL SAFETY CAR ENDING — TRACK CLEAR')), null);
 assert.equal(currentNeutralisation(messages('SAFETY CAR DEPLOYED')), 'sc');
 assert.equal(currentNeutralisation(messages('SAFETY CAR DEPLOYED', 'SAFETY CAR IN THIS LAP')), null);
});
