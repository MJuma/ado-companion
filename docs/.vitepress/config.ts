import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'ADO Companion',
    description:
        'A cross-browser extension that adds extra functionality to Azure DevOps.',
    base: '/ado-companion/',
    head: [['meta', { name: 'theme-color', content: '#0078d4' }]],
    themeConfig: {
        nav: [
            { text: 'Guide', link: '/guide/' },
            { text: 'Install', link: '/guide/install' },
            { text: 'GitHub', link: 'https://github.com/MJuma/ado-companion' },
        ],
        sidebar: [
            {
                text: 'Getting Started',
                items: [
                    { text: 'Introduction', link: '/guide/' },
                    { text: 'Install', link: '/guide/install' },
                ],
            },
        ],
        socialLinks: [
            { icon: 'github', link: 'https://github.com/MJuma/ado-companion' },
        ],
        footer: {
            message: 'Released under the MIT License.',
        },
    },
});
