import { setup } from 'xstate';

export const recurringFlowMachine = setup({
  types: {
    events: {} as
      | { type: 'activate' }
      | { type: 'pause' }
      | { type: 'resume' }
      | { type: 'end' },
  },
}).createMachine({
  id: 'recurringFlow',
  initial: 'draft',
  states: {
    draft: {
      on: {
        activate: 'active',
      },
    },
    active: {
      on: {
        pause: 'paused',
        end: 'ended',
      },
    },
    paused: {
      on: {
        resume: 'active',
        end: 'ended',
      },
    },
    ended: {
      type: 'final',
    },
  },
});
