import { vitePlugin } from '@remcovaes/web-test-runner-vite-plugin'
import { playwrightLauncher } from '@web/test-runner-playwright'

export default {
	browsers: [
		playwrightLauncher({ product: 'chromium' })
	],
	files: ['test/*'],
	nodeResolve: true,
	plugins: [vitePlugin()],
	testFramework: {
		config: {
			ui: 'tdd',
			timeout: 500
		}
	}
}