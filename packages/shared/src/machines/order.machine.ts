import { setup } from 'xstate';

export const orderMachine = setup({
  types: {
    events: {} as
      | { type: 'place' }
      | { type: 'start' }
      | { type: 'complete' }
      | { type: 'cancel' },
  },
}).createMachine({
  id: 'order',
  initial: 'draft',
  states: {
    draft: {
      on: {
        place: 'new',
        cancel: 'cancelled',
      },
    },
    new: {
      on: {
        start: 'processing',
        cancel: 'cancelled',
      },
    },
    processing: {
      on: {
        complete: 'completed',
        cancel: 'cancelled',
      },
    },
    completed: {
      type: 'final',
    },
    cancelled: {
      type: 'final',
    },
  },
});
