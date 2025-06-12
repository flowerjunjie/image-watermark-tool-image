export default defineNuxtConfig({
    devtools: {enabled: false},
    app: {
        // head
        head: {
            title: 'Image Watermark Tool',
            meta: [
                {name: 'viewport', content: 'width=device-width, initial-scale=1'},
                {
                    name: 'referrer',
                    content: 'no-referrer'
                },
                {
                    name: 'referrer',
                    content: 'always'
                },
                {
                    name: 'referrer',
                    content: 'strict-origin-when-cross-origin'
                }
            ],
            link: [{rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'}],
            script: []
        },
        baseURL: './',
    },
    // build modules
    modules: [
        '@element-plus/nuxt',
        '@nuxtjs/tailwindcss',
        '@nuxtjs/device',
        '@nuxtjs/i18n',
        'nuxt-icon'
    ],
    i18n: {
        defaultLocale: 'cn',
        langDir: './assets/lang/',
        locales: [
            {
                code: 'en',
                name: 'English',
                iso: 'en-US',
                file: 'en-US.json'
            },
            {
                code: 'cn',
                name: '中文',
                iso: 'zh-CN',
                file: 'zh-CN.json'
            }
        ],
    },
    plugins: [
        // 仅在客户端运行的插件
        { src: '~/plugins/electron.client.js', mode: 'client' }
    ],
    nitro: {
        devProxy: {},
        output: {
            publicDir: '.output/public', // 确保输出目录一致
        }
    },
    runtimeConfig: {
        openaiApiKey: '',
        proxyUrl: '',
        public: {
            isElectron: process.env.IS_ELECTRON === 'true',
            buildMode: process.env.NODE_ENV
        }
    },
    // 添加Electron支持
    ssr: false, // 桌面应用不需要SSR
    experimental: {
        payloadExtraction: false
    },
    vite: {
        server: {
            hmr: {
                protocol: 'ws',
                host: 'localhost'
            }
        },
        build: {
            target: 'chrome100', // 针对现代浏览器优化构建
            sourcemap: true
        }
    }
})