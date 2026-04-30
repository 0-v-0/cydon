import { defineConfig } from 'vite'
import dts from 'unplugin-dts/vite'

const normalizeIndent = (content: string) => content
	.replace(/^( {4})+/gm, match => '\t'.repeat(match.length / 4))

export default defineConfig({
	build: {
		lib: {
			entry: ['index.ts', 'styl.ts'],
			formats: ['es'],
		},
		minify: false,
		rolldownOptions: {
			external: s => !s.includes('simpletpl')
		},
	},
	plugins: [dts({
		beforeWriteFile(filePath, content) {
			return {
				filePath,
				content: normalizeIndent(content)
			}
		}
	})]
})
