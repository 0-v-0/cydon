'use strict';

import { compileTS, runTask } from 'mefes';

runTask({
	compile: () => compileTS({ entryPoints: ['src/cydon.ts'], outdir: 'dist' }),
	release: () => compileTS({ entryPoints: ['src/cydon.ts'], outdir: 'dist', minify: true })
}, "compile");
