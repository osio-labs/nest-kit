import { defineConfig } from 'vitepress';
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

export default defineConfig({
  markdown: {
    config(md) {
      tabsMarkdownPlugin(md);
    },
  },
  title: '@os.io/nest-kit',
  description: 'A modular, production-ready NestJS toolkit',
  base: '/nest-kit/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Modules', link: '/modules/overview' },
      { text: 'Changelog', link: '/changelog' },
      { text: 'Contributing', link: '/contributing' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Module Overview', link: '/modules/overview' },
        ],
      },
      {
        text: 'Core',
        link: '/modules/core',
        items: [],
      },
      {
        text: 'Bootstrap',
        link: '/modules/bootstrap',
        collapsed: true,
        items: [
          { text: 'Swagger', link: '/modules/bootstrap-swagger' },
          { text: 'Scalar', link: '/modules/bootstrap-scalar' },
          { text: 'Cache', link: '/modules/bootstrap-cache' },
          { text: 'TypeORM', link: '/modules/bootstrap-typeorm' },
        ],
      },
      {
        text: 'Auth',
        link: '/modules/auth',
        collapsed: true,
        items: [
          { text: 'Configuration', link: '/modules/auth-configuration' },
          { text: 'Strategies', link: '/modules/auth-strategies' },
          { text: 'Guards & Decorators', link: '/modules/auth-guards' },
          { text: 'Interfaces', link: '/modules/auth-interfaces' },
          { text: 'Session Management', link: '/modules/auth-session' },
          { text: 'Authorization', link: '/modules/auth-authorization' },
          { text: 'Services', link: '/modules/auth-services' },
        ],
      },
      {
        text: 'SaaS',
        link: '/modules/saas',
        items: [],
      },
      {
        text: 'Infrastructure',
        link: '/modules/infra',
        collapsed: true,
        items: [
          { text: 'Storage', link: '/modules/infra-storage' },
          { text: 'Excel', link: '/modules/infra-excel' },
          { text: 'Logger', link: '/modules/infra-logger' },
          { text: 'Notification', link: '/modules/infra-notification' },
          { text: 'Stripe', link: '/modules/infra-stripe' },
          { text: 'Audit Log', link: '/modules/infra-audit-log' },
          { text: 'Metrics', link: '/modules/infra-metrics' },
        ],
      },
      // ──────── Coming soon ────────
      {
        text: 'More',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/osio-labs/nest-kit' },
    ],
    footer: {
      message: 'MIT Licensed',
      copyright: 'Copyright © 2026-present Wind Blade',
    },
  },
});
