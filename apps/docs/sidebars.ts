import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/project-structure',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/value-streams',
        'concepts/agents',
        'concepts/values',
        'concepts/exchanges',
        'concepts/offerings',
        'concepts/agreements',
        'concepts/channels',
        'concepts/tensions',
      ],
    },
  ],
};

export default sidebars;
