import { setup } from 'xstate';

export const tensionMachine = setup({
  types: {
    events: {} as
      | { type: 'resolve' }
      | { type: 'drop' }
      | { type: 'reopen' }
      | { type: 'revive' },
  },
}).createMachine({
  id: 'tension',
  initial: 'alive',
  states: {
    alive: {
      on: {
        resolve: 'resolved',
        drop: 'stale',
      },
    },
    resolved: {
      on: {
        reopen: 'alive',
      },
    },
    stale: {
      on: {
        revive: 'alive',
      },
    },
  },
});
