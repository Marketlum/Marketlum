import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', '686'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', 'eee'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '9af'),
            routes: [
              {
                path: '/concepts/agents',
                component: ComponentCreator('/concepts/agents', '061'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/concepts/agreements',
                component: ComponentCreator('/concepts/agreements', '533'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/concepts/channels',
                component: ComponentCreator('/concepts/channels', '3b3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/concepts/exchanges',
                component: ComponentCreator('/concepts/exchanges', 'ab4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/concepts/offerings',
                component: ComponentCreator('/concepts/offerings', 'f5a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/concepts/tensions',
                component: ComponentCreator('/concepts/tensions', '1c7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/concepts/value-streams',
                component: ComponentCreator('/concepts/value-streams', '7a4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/concepts/values',
                component: ComponentCreator('/concepts/values', 'afa'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/installation',
                component: ComponentCreator('/getting-started/installation', 'e0c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/project-structure',
                component: ComponentCreator('/getting-started/project-structure', '508'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/quickstart',
                component: ComponentCreator('/getting-started/quickstart', 'c60'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', '7da'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
