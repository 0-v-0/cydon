/*
 * pjam
 * 将页面所有的跳转替换为ajam请求，把网站改造成单页面应用
 * 兼容Chrome 84+
 * 在更低版本的浏览器和搜索引擎蜘蛛上，保持默认跳转，不受影响
 */
import { wsAPI } from './wsapi'
import { getCache, setCache } from './db'
import Events from 'cydon/events'

/**
 * 获取url中的路径
 * getPath('example.com/abcd') => '/abcd'
 * @param {String} url
 */
export const getPath = (url: string) => url.replace(location.protocol + '//' + location.host, '')

const
	/**
	 * 通过相对路径获取完整的url
	 * @param {String} href
	 */
	getURL = (url: string | URL) => new URL(url, location.href),

	// 在浏览器前进后退时执行
	popstate = () => turn(location.href, true),

	click = (e: Event) => {
		const el = e.target as HTMLAnchorElement

		// 过滤不匹配选择器的元素
		if (!el.matches(PJAM.selector)) return

		// 优先使用pjam-href
		const href = el.getAttribute('pjam-href') || el.href

		// 过滤空值
		if (!href || el.target && el.target != '_self') return

		const { origin, pathname } = getURL(href)
		if (origin != location.origin ||
			pathname == location.pathname) return

		// 阻止默认跳转
		e.preventDefault()

		// 标签的data-pjam属性值将作为data传入新页面
		turn(href, false, el.dataset.pjam)
	},

	// 跳转到指定页面
	// fnb = Forward And Back，表示当前操作是否由前进和后退触发
	turn = (url: string, fnb: boolean, data?: any, callback?: Function) =>
		PJAM.emit('update', getPath(url), fnb, data, callback)

export const PJAM = Events({
	// 要替换内容的容器，类型：DOM对象
	container: document.body,
	selector: '',
	/**
	 * 初始化
	 * @param {String} s 选择器，支持querySelector选择器
	 */
	bind(s: string = 'a') {
		if (!PJAM.container)
			return

		addEventListener('popstate', popstate)
		addEventListener('click', click)
		if (PJAM.selector)
			return

		PJAM.selector = s
		PJAM.emit('init')
	},
	/**
	 * 注销插件
	 */
	unbind() {
		PJAM.events = null
		removeEventListener('popstate', popstate)
		removeEventListener('click', click)
	},
	/**
	 * 使用pjam跳转到指定页面
	 * @param {String}   url
	 * @param {Object}   data     要传到新页面的参数，可以为null
	 * @param {Function} callback 请求成功时的回调
	 */
	jump(url: string, data?: any, callback?: Function) {
		turn(url, false, data, callback)
	}
})

PJAM.on('update', (url: string, fnb?: boolean, adata?: any, callback?: any) => {
	PJAM.emit('start');
	getCache(url).then(cache =>
		wsAPI.page(url, cache?.time || 0).then(async ([err, tpl, data]) => {
			if (err) {
				if (err == '304') // use cache
					({ tpl, data } = cache)
				throw new Error(err)
			}
			if (tpl)
				setCache(url, {
					tpl,
					data,
					time: Math.floor(+new Date / 1000)
				})
			if (adata)
				data.data = adata
			PJAM.emit('render', tpl, data, url)
			if (!fnb)
				history.pushState('', '', url)
		})).catch(e => {
			PJAM.emit('error', e);
			return e
		}).finally(() => PJAM.emit('done', callback))
})

wsAPI.open()