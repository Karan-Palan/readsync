import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import { copy } from 'fs-extra'

const copyPDFJS = () => ({
    name: 'copy-pdfjs',
    async writeBundle() {
        await copy('node_modules/pdfjs-dist/build/pdf.mjs', 'vendor/pdfjs/pdf.mjs')
        await copy('node_modules/pdfjs-dist/build/pdf.mjs.map', 'vendor/pdfjs/pdf.mjs.map')
        await copy('node_modules/pdfjs-dist/build/pdf.worker.mjs', 'vendor/pdfjs/pdf.worker.mjs')
        await copy('node_modules/pdfjs-dist/build/pdf.worker.mjs.map', 'vendor/pdfjs/pdf.worker.mjs.map')
        await copy('node_modules/pdfjs-dist/cmaps', 'vendor/pdfjs/cmaps')
        await copy('node_modules/pdfjs-dist/standard_fonts', 'vendor/pdfjs/standard_fonts')
    },
})

export default [
    // Main library build - ESM only (due to top-level await)
    {
        input: 'index.js',
        output: [
            {
                file: 'dist/index.js',
                format: 'esm',
                sourcemap: true,
                inlineDynamicImports: true
            }
        ],
        plugins: [nodeResolve()]
        // 移除 external 配置，让所有依赖都被打包
    },
    // Minified ESM version
    {
        input: 'index.js',
        output: [
            {
                file: 'dist/index.min.js',
                format: 'esm',
                sourcemap: true,
                inlineDynamicImports: true
            }
        ],
        plugins: [nodeResolve(), terser()]
        // 移除 external 配置
    },
    // Vendor dependencies (existing) - 保留这些用于独立使用
    {
        input: 'rollup/fflate.js',
        output: {
            dir: 'vendor/',
            format: 'esm',
        },
        plugins: [nodeResolve(), terser()],
    },
    {
        input: 'rollup/zip.js',
        output: {
            dir: 'vendor/',
            format: 'esm',
        },
        plugins: [nodeResolve(), terser(), copyPDFJS()],
    }]
