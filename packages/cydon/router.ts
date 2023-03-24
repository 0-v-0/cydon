import { Constructor as Ctor } from '.'
import { onDOMContentLoaded } from '../ui'

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

		routerRunning?: boolean

		/** 开始监听事件 */
		start() {
			if (import.meta.env.DEV) {
				if (!this.root)
					return console.warn('root element is not defined')

				if (this.routerRunning)
					return console.warn('router is already running')

				this.routerRunning = true
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
							this.jump(url, el.dataset)
						}
					}
				},
					popstate = (e: PopStateEvent) => this.jump(location.href, e.state, true)
				this.addEventListener('click', click)
				addEventListener('popstate', popstate)
				this.stop = () => {
					this.removeEventListener('click', click)
					removeEventListener('popstate', popstate)
				}
				onDOMContentLoaded(() => this.jump(location.href, null, true))
			}
		}

		/** 停止监听事件 */
		stop!: () => void

		/**
		 * 跳转到指定页面
		 * @param url
		 * @param data     要传到新页面的参数，可省略
		 * @param fnb      Forward And Back，表示当前操作是否由前进和后退触发
		 */
		jump(url: string, data?: any, fnb = false) {
			if (!fnb)
				history.pushState(data, '', getPath(url))
		}
	}
	return <Ctor<T & Mixin>>Mixin
}
