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
    {
      type: 'category',
      label: 'Customization Guide',
      items: [
        'customization/overview',
        'customization/branding',
        'customization/translations',
        'customization/environment',
        'customization/seed-data',
        'customization/extending-api',
        'customization/extending-web',
        'customization/taxonomies-archetypes',
      ],
    },
    {
      type: 'category',
      label: 'Contributing Guide',
      items: [
        'contributing/overview',
        'contributing/dev-setup',
        'contributing/repo-layout',
        'contributing/bdd-workflow',
        'contributing/testing',
        'contributing/coding-conventions',
        'contributing/migrations',
        'contributing/submitting-a-pr',
      ],
    },
  ],
};

export default sidebars;
