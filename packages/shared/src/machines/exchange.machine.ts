import { setup } from 'xstate';

export const exchangeMachine = setup({
  types: {
    events: {} as
      | { type: 'close' }
      | { type: 'complete' }
      | { type: 'reopen' },
  },
}).createMachine({
  id: 'exchange',
  initial: 'open',
  states: {
    open: {
      on: {
        close: 'closed',
        complete: 'completed',
      },
    },
    closed: {
      on: {
        reopen: 'open',
      },
    },
    completed: {
      type: 'final',
    },
  },
});
