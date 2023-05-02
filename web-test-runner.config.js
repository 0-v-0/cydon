import { esbuildPlugin } from '@web/dev-server-esbuild'
import { playwrightLauncher } from '@web/test-runner-playwright'

export default {
	browsers: [
		playwrightLauncher({ product: 'chromium' })
	],
	files: ['test/*'],
	nodeResolve: true,
	plugins: [esbuildPlugin({ ts: true, target: 'es2020' })],
	testFramework: {
		config: {
			ui: 'tdd',
			timeout: 500
		}
	}
}