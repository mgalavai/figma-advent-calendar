const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['src/widget/code.tsx'],
    bundle: true,
    outfile: 'dist/code.js',
    target: 'es6',
    format: 'iife',
    globalName: undefined,
    minify: false,
    sourcemap: false,
    jsxFactory: 'figma.widget.h',
    jsxFragment: 'figma.widget.Fragment',
    loader: { '.html': 'text' },
}).then(() => {
    console.log('Widget built successfully');
}).catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
