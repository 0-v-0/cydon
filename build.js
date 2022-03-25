'use strict';

const { compileTS, runTask } = require('mefes');

runTask({
	compile: () => compileTS({ entryPoints: ['src/cydon.ts'], outdir: 'dist' }),
	compileExt: () => compileTS({ entryPoints: ['src/cydon.ts'], external: ["morphdom"], outdir: 'dist' })
}, "compile");
