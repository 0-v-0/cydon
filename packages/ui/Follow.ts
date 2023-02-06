/**
 * From https://github.com/yued-fe/lulu/blob/master/theme/edge/js/common/ui/Follow.js
 */

interface FollowElement extends HTMLElement {
	params?: {}
	element?: {}
}

interface Option {
	offsets?: {
		x: number
		y: number
	} | [number, number]
	safeArea?: number[]
	position?: number | [number, number]
	edgeAdjust?: boolean
}

export const follow = function (this: FollowElement, eleTarget: HTMLElement | null, options: Option = {}) {
	// 默认参数值
	const defaults = {
		offsets: {
			x: 0,
			y: 0
		},
		safeArea: [0, 0, 0, 0],
		// eleTrigger-eleTarget
		position: 41,
		// 边缘位置自动调整
		edgeAdjust: true
	}
	const params = Object.assign(defaults, options)

	// eleTarget 非必须，可 eleTrigger 元素 html 属性指定
	if (!eleTarget) {
		const target = this.dataset.target
		eleTarget = target ? document.querySelector(target) : null
		if (!eleTarget)
			return
	}

	// 合法的位置关系数据
	const arrLegalPosition = [41, 14, 57, 23, 21, 68, 34, 43, 86, 12, 75, 32]

	// eleTrigger 元素属性指定 options，传入的 options 参数优先级更高
	// offsets
	const dataOffsets = this.dataset.offsets
	let arrOffsets = (<number[]>params.offsets).map ? params.offsets : <string[]>[]
	if (dataOffsets && !options.offsets)
		arrOffsets = dataOffsets.trim().split(/\s+/)

	// 如果arrOffsets有值
	if ((<string[]>arrOffsets).length)
		params.offsets = { x: +(<string[]>arrOffsets)[0], y: +(<string[]>arrOffsets)[1] || +(<string[]>arrOffsets)[0] }

	// position
	let dataPos = this.dataset.position
	let dataAlign = this.dataset.align
	// data-align是否符合合法位置关系
	let isDataAlignMatch = arrLegalPosition.some((strLegalPosition: any) => strLegalPosition == dataAlign)
	// 若没有设置 data-position，设置了 data-align 也行，若都设置了以 data-position 的值为准
	if (!dataPos && dataAlign && isDataAlignMatch) {
		dataPos = dataAlign
	}
	if (dataPos && (!options || !options.position)) {
		params.position = +dataPos
	}

	// edge-adjust
	let dataEdgeAdjust = this.dataset.edgeAdjust || params.edgeAdjust
	// data-edge-adjust 字符串为 0、none、false 认为是 false，其他都是 true
	let isEdgeAdjust = !(dataEdgeAdjust == '0' || dataEdgeAdjust == 'none' || dataEdgeAdjust == 'false' || dataEdgeAdjust == false)
	if (typeof dataEdgeAdjust == 'string' && typeof params.edgeAdjust != 'boolean') {
		params.edgeAdjust = isEdgeAdjust
	}

	// 先绝对定位，以便获取更准确的尺寸
	const strOriginPosition = eleTarget.style.position
	if (strOriginPosition != 'absolute') {
		eleTarget.style.position = 'absolute'
	}

	// 触发元素和目标元素的坐标数据
	let objBoundTrigger = this.getBoundingClientRect(),
		objBoundTarget = eleTarget.getBoundingClientRect()

	// 如果目标元素隐藏，则不处理
	if (objBoundTarget.width * objBoundTarget.height == 0) {
		eleTarget.style.position = strOriginPosition
		console.warn(eleTarget, '目前元素尺寸为0，无法定位')
		return
	}

	// 页面的水平和垂直滚动距离
	const numScrollTop = scrollY, numScrollLeft = scrollX

	// 浏览器窗口的尺寸
	const numWinWidth = innerWidth, numWinHeight = innerHeight

	// 如果trigger元素全部都在屏幕外，则不进行边缘调整
	if ((objBoundTrigger.left < 0 && objBoundTrigger.right < 0) ||
		(objBoundTrigger.top < 0 && objBoundTrigger.bottom < 0) ||
		(objBoundTrigger.left > numWinWidth && objBoundTrigger.right > numWinWidth) ||
		(objBoundTrigger.top > numWinHeight && objBoundTrigger.bottom > numWinHeight)) {
		params.edgeAdjust = isEdgeAdjust = false
	}

	// target的包含块祖先元素，也就是定位元素
	const eleOffsetParent = eleTarget.offsetParent!
	const objBoundOffsetParent = eleOffsetParent.getBoundingClientRect()

	// 暴露给实例
	const element = {
		follow: eleTarget
	}

	this.element = this.element ? Object.assign(this.element, element) : element
	this.params = this.params ? Object.assign(this.params, params) : params

	// 参数中设置的偏移位置
	const offsets = params.offsets
	// target元素所在的offset偏移
	let numOffsetTop = objBoundOffsetParent.top + numScrollTop
	let numOffsetLeft = objBoundOffsetParent.left + numScrollLeft

	// 如果是body元素，同时没有设置定位属性的话，忽略
	// 因为此时margin有值或者margin重叠时候会有定位bug
	if (eleOffsetParent == document.body && getComputedStyle(eleOffsetParent).position == 'static') {
		numOffsetTop = 0
		numOffsetLeft = 0
	}

	// 直接嫁接在offsets对象上，可以大大简化后续处理的逻辑
	// 减去包含块元素的偏移位置，这样的objOffsets尺寸是精准的定位尺寸
	// objOffsets.x -= numOffsetLeft
	// objOffsets.y -= numOffsetTop

	// 这是指定位置
	// 支持具体坐标值
	let pos: number | [number, number] = params.position

	// 最终定位的left/top坐标
	let numTargetLeft: number, numTargetTop: number

	// eleTarget元素zIndex实时最大化
	const zIndex = () => {
		// 返回eleTarget才是的样式计算对象
		let objStyleTarget = getComputedStyle(eleTarget!)
		// 此时元素的层级
		let numZIndexTarget = +objStyleTarget.zIndex
		// 用来对比的层级，也是最小层级
		let numZIndexNew = 19

		// 只对同级子元素进行层级最大化计算处理
		eleOffsetParent.childNodes.forEach((eleChild) => {
			if (eleChild.nodeType == 1) {
				const objStyleChild = getComputedStyle(<Element>eleChild)
				const numZIndexChild = +objStyleChild.zIndex

				if (numZIndexChild && eleTarget != eleChild && objStyleChild.display !== 'none') {
					numZIndexNew = Math.max(numZIndexChild + 1, numZIndexNew)
				}
			}
		})

		if (numZIndexNew != numZIndexTarget)
			eleTarget!.style.zIndex = numZIndexNew + ''
	}

	// 如果直接指定了坐标
	if ((<number[]>pos).length == 2) {
		const [x, y] = <number[]>pos

		numTargetLeft = x + offsets.x
		numTargetTop = y + offsets.y

		// 边缘检测
		if (params.edgeAdjust) {
			if (numTargetLeft + objBoundTarget.width > numWinWidth + numScrollLeft)
				numTargetLeft = numWinWidth + numScrollLeft - objBoundTarget.width - offsets.x
			if (numTargetTop + objBoundTarget.height > numWinHeight + numScrollTop)
				numTargetTop = numWinHeight + numScrollTop - objBoundTarget.height - offsets.y
		}
		// 浮动框的定位与显示
		eleTarget.style.left = numTargetLeft + 'px'
		eleTarget.style.top = numTargetTop + 'px'
		// 记住定位标识码
		eleTarget.dataset.align = '31'

		// z-index自动最高
		return zIndex()
	}

	// 如果没有匹配的对齐方式，使用默认的对齐方式
	if (!arrLegalPosition.some(strLegalPosition => strLegalPosition == pos))
		pos = defaults.position

	// 自动调整距离边缘的安全距离
	let arrSafeArea = (this.dataset.safeArea || getComputedStyle(eleTarget).getPropertyValue('--safe-area'))?.trim()
		.split(/(?:,\s*|\s+)/).map(val => parseFloat(val) || 0) || params.safeArea
	// 数量的处理
	if (arrSafeArea.length == 1)
		arrSafeArea = arrSafeArea.concat(arrSafeArea[0], arrSafeArea[0], arrSafeArea[0])
	else if (arrSafeArea.length == 2)
		arrSafeArea.push(arrSafeArea[0], arrSafeArea[1])
	else if (arrSafeArea.length == 3)
		arrSafeArea.push(arrSafeArea[1])

	// 是否超出边界的判断
	// 只考虑在视区的情况，页面的滚动距离不处理
	const objIsOverflow = {
		// 键使用trigger target方位表示
		// 例如lr表示trigger元素的左边缘和target元素右边缘对齐时候是否溢出
		lr: objBoundTarget.width + offsets.x + arrSafeArea[3] > objBoundTrigger.left,
		tb: objBoundTrigger.top - (objBoundTarget.height + offsets.y + arrSafeArea[0]) < 0,
		rl: objBoundTrigger.right + objBoundTarget.width + offsets.x + arrSafeArea[1] > numWinWidth,
		bt: objBoundTrigger.bottom + objBoundTarget.height + offsets.y + arrSafeArea[2] > numWinHeight,
		// 新增4个方位
		rr: objBoundTarget.width + offsets.x + arrSafeArea[3] > objBoundTrigger.right,
		ll: objBoundTrigger.left + objBoundTarget.width + offsets.x + arrSafeArea[1] > numWinWidth,
		bb: objBoundTarget.height + offsets.y + arrSafeArea[0] > objBoundTrigger.bottom,
		tt: objBoundTrigger.top + objBoundTarget.height + offsets.y + arrSafeArea[2] > numWinHeight
	}

	let direction = 'bottom'

	const funGetPosition = () => {
		// 定位的处理
		// 有别于之前的逻辑
		// 直接枚举处理，覆盖所有的情况，之前是方位调整比较粗放
		switch (pos) {
			case 14: case 57: case 23: {
				// 如果在上方显示
				// top坐标是确定的
				numTargetTop = objBoundTrigger.top - objBoundTarget.height
				// left坐标确定
				numTargetLeft = pos == 14 ? objBoundTrigger.left :
					pos == 57 ?
						objBoundTrigger.left - (objBoundTarget.width - objBoundTrigger.width) / 2 :
						objBoundTrigger.left - (objBoundTarget.width - objBoundTrigger.width)

				direction = 'top'

				// 如果上方超出，则看看下方有没有空间
				if (isEdgeAdjust && objIsOverflow.tb) {
					if (!objIsOverflow.bt) {
						pos = ({
							14: 41,
							57: 75,
							23: 32
						})[pos]
						// 再执行一次
						funGetPosition()
					} else if (!objIsOverflow.lr || !objIsOverflow.rl) {
						// 上下无空间，但是左侧或右侧有空间
						// 随便给个水平方向就好
						pos = ({
							14: 21,
							57: 68,
							23: 34
						})[pos]
						funGetPosition()
					}
				}

				break
			}
			case 21: case 68: case 34: {
				// left坐标固定
				numTargetLeft = objBoundTrigger.right
				// top坐标确定
				numTargetTop = pos == 21 ? objBoundTrigger.top :
					pos == 68 ?
						objBoundTrigger.top - (objBoundTarget.height - objBoundTrigger.height) / 2 :
						objBoundTrigger.top - (objBoundTarget.height - objBoundTrigger.height)

				direction = 'right'

				// 如果右侧超出，则看看左方有没有空间
				if (isEdgeAdjust && objIsOverflow.rl) {
					if (!objIsOverflow.lr) {
						pos = ({
							21: 12,
							68: 86,
							34: 43
						})[pos]
						// 再执行一次
						funGetPosition()
					} else if (!objIsOverflow.tb || !objIsOverflow.bt) {
						pos = ({
							21: 14,
							68: 57,
							34: 23
						})[pos]
						// 再执行一次
						funGetPosition()
					}
				}

				break
			}
			case 41: case 75: case 32: {
				// top坐标是确定的
				numTargetTop = objBoundTrigger.bottom
				// left坐标确定
				numTargetLeft = pos == 41 ? objBoundTrigger.left :
					pos == 75 ?
						objBoundTrigger.left - (objBoundTarget.width - objBoundTrigger.width) / 2 :
						objBoundTrigger.left - (objBoundTarget.width - objBoundTrigger.width)

				direction = 'bottom'

				// 如果下方超出，则看看上方有没有空间
				if (isEdgeAdjust && objIsOverflow.bt) {
					if (!objIsOverflow.tb) {
						pos = ({
							41: 14,
							75: 57,
							32: 23
						})[pos]
						// 再执行一次
						funGetPosition()
					} else if (!objIsOverflow.lr || !objIsOverflow.rl) {
						// 上下无空间，但是左侧或右侧有空间
						// 随便给个水平方向就好
						pos = ({
							41: 21,
							75: 68,
							32: 34
						})[pos]
						funGetPosition()
					}
				}

				break
			}
			case 12: case 86: case 43: {
				// left坐标固定
				numTargetLeft = objBoundTrigger.left - objBoundTarget.width
				// top坐标确定
				numTargetTop = pos == 12 ? objBoundTrigger.top :
					pos == 86 ?
						objBoundTrigger.top - (objBoundTarget.height - objBoundTrigger.height) / 2 :
						objBoundTrigger.top - (objBoundTarget.height - objBoundTrigger.height)

				direction = 'left'

				// 如果左侧超出，则看看右侧有没有空间
				if (isEdgeAdjust && objIsOverflow.lr) {
					if (!objIsOverflow.rl) {
						pos = ({
							12: 21,
							86: 68,
							43: 34
						})[pos]
						// 再执行一次
						funGetPosition()
					} else if (!objIsOverflow.tb || !objIsOverflow.bt) {
						pos = ({
							12: 14,
							86: 57,
							43: 23
						})[pos]
						// 再执行一次
						funGetPosition()
					}
				}

				break
			}
		}
	}
	funGetPosition()

	numTargetLeft = numTargetLeft! + offsets.x - numOffsetLeft
	numTargetTop = numTargetTop! + offsets.y - numOffsetTop

	// 边界溢出，当前方位的安全举例处理
	if (isEdgeAdjust) {
		// 水平方向的微调
		if (direction == 'top') {
			numTargetTop = numTargetTop - arrSafeArea[2]
		} else if (direction == 'bottom') {
			numTargetTop = numTargetTop + arrSafeArea[0]
		} else if (direction == 'left') {
			numTargetLeft = numTargetLeft - arrSafeArea[1]
		} else {
			numTargetLeft = numTargetLeft + arrSafeArea[3]
		}
	}

	// 加上滚动距离
	numTargetTop += numScrollTop
	numTargetLeft += numScrollLeft

	//浮动框显示
	eleTarget.style.left = Math.round(numTargetLeft) + 'px'
	eleTarget.style.top = Math.round(numTargetTop) + 'px'

	// 此时的eleTarget位置
	objBoundTarget = eleTarget.getBoundingClientRect()
	// 对立分享水平方向的微调
	if (isEdgeAdjust) {
		if (direction == 'top' || direction == 'bottom') {
			if (objBoundTarget.left < arrSafeArea[3]) {
				numTargetLeft = numTargetLeft + (arrSafeArea[3] - objBoundTarget.left)
			} else if (objBoundTarget.right + arrSafeArea[1] > numWinWidth) {
				numTargetLeft = numTargetLeft - (objBoundTarget.right + arrSafeArea[1] - numWinWidth)
			}
		} else if (objBoundTarget.top < arrSafeArea[0]) {
			numTargetTop += arrSafeArea[0] - objBoundTarget.top
		} else if (objBoundTarget.bottom + arrSafeArea[2] > numWinHeight) {
			numTargetTop -= (objBoundTarget.bottom + arrSafeArea[2] - numWinHeight)
		}

		//浮动框显示
		eleTarget.style.left = Math.round(numTargetLeft) + 'px'
		eleTarget.style.top = Math.round(numTargetTop) + 'px'
	}

	eleTarget.dataset.align = pos + ''
	eleTarget.dataset.direction = direction

	// z-index自动最高
	zIndex()
}
/*
[NodeList.prototype, HTMLCollection.prototype].forEach(prop => {
	prop.follow = function () {
		[...this].forEach(node => {
			if (node.nodeType == 1)
				node.follow.apply(node, arguments)
		})
	}
})
*/