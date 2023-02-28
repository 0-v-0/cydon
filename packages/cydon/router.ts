import { Constructor as Ctor, DOM } from '.'

export type Callback = (url: string, fnb?: boolean, data?: any) => void

/**
 * 获取url中的路径
 * getPath('example.com/abcd') => '/abcd'
 * @param url
 */
export const getPath = (url: string) => url.replace(location.protocol + '//' + location.host, '')

export const Router = <T extends HTMLElement>(base: Ctor<T>) => {
	class Mixin extends (<Ctor<HTMLElement>>base) {
		/** 要替换内容的容器 */
		root = this

		/**
		 * 监听元素下所有的匹配该选择器的元素的点击事件
		 */
		selector = 'a'

		_routerRunning?: boolean

		/** 开始监听事件 */
		start() {
			if (import.meta.env.DEV) {
				if (!this.root)
					return console.warn('root element is not defined')

				if (this._routerRunning)
					return console.warn('router is already running')

				this._routerRunning = true
			}

			if (this.root) {
				const click = (e: MouseEvent) => {
					if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button != 1)
						return
					const el = <HTMLAnchorElement>e.target

					// 过滤不匹配选择器的元素
					if (el.matches(this.selector)) {
						const url = el.href

						// 过滤空值
						if (!url || el.target && el.target != '_self' || el.download || el.rel == 'external') return

						// 仅同源页面
						const { origin, pathname } = new URL(url, location.href)
						if (origin == location.origin &&
							pathname != location.pathname) {
							// 阻止默认跳转
							e.preventDefault()
							e.stopPropagation()

							// 标签的data-属性值将作为data传入新页面
							this.jump(url, false, el.dataset)
						}
					}
				},
					popstate = (e: PopStateEvent) => this.jump(location.href, true, e.state)
				this.addEventListener('click', click)
				addEventListener('popstate', popstate)
				this.stop = () => {
					this.removeEventListener('click', click)
					removeEventListener('popstate', popstate)
				}
				addEventListener('DOMContentLoaded', () => this.jump(location.href, true))
			}
		}

		/** 停止监听事件 */
		stop!: () => void

		/**
		 * 跳转到指定页面
		 * @param url
		 * @param fnb      Forward And Back，表示当前操作是否由前进和后退触发
		 * @param data     要传到新页面的参数，可省略
		 * @param callback 请求成功时的回调
		 */
		jump(url: string, fnb = false, data?: any, callback?: Callback) {
			url = getPath(url)
			try {
				for (const el of this.root.children) {
					const path = el.getAttribute('c-path') || el.getAttribute('src')
					if (path)
						(<DOM>el).style.display = url == path ? '' : 'none'
				}
				if (!fnb)
					history.pushState('', '', url)
			} finally {
				callback?.(url, fnb, data)
			}
		}
	}
	return <Ctor<T & Mixin>>Mixin
}
