import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '@os.io/nest-kit',
  description:
    'A modular, production-ready NestJS toolkit — Bootstrap, Auth, SaaS, and Infra integrations in a single package.',
  base: '/nest-kit/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Modules', link: '/modules/overview' },
      { text: 'GitHub', link: 'https://github.com/osio-labs/nest-kit' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is nest-kit?', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
        ],
      },
      {
        text: 'Modules',
        items: [
          { text: 'Overview', link: '/modules/overview' },
          { text: 'Core', link: '/modules/core' },
          { text: 'Bootstrap', link: '/modules/bootstrap' },
          { text: 'Bootstrap / Swagger', link: '/modules/bootstrap-swagger' },
          { text: 'Bootstrap / Cache', link: '/modules/bootstrap-cache' },
          { text: 'Bootstrap / TypeORM', link: '/modules/bootstrap-typeorm' },
          { text: 'Auth', link: '/modules/auth' },
          { text: 'SaaS', link: '/modules/saas' },
          { text: 'Infra', link: '/modules/infra' },
          { text: 'Infra / Logger', link: '/modules/infra-logger' },
          { text: 'Infra / Notification', link: '/modules/infra-notification' },
          { text: 'Infra / Storage', link: '/modules/infra-storage' },
          { text: 'Infra / Stripe', link: '/modules/infra-stripe' },
          { text: 'Infra / Audit Log', link: '/modules/infra-audit-log' },
          { text: 'Infra / Metrics', link: '/modules/infra-metrics' },
        ],
      },
      {
        text: 'Contributing',
        items: [
          { text: 'Guide', link: '/contributing' },
          { text: 'Changelog', link: '/changelog' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/osio-labs/nest-kit' }],
  },
});
