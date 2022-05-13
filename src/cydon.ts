/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

const RE = /\$([_a-zA-Z][_a-zA-Z0-9\.]*)(?:@([_a-zA-Z][_a-zA-Z0-9]*))?/,
	PatternSize = 3,
	ToString = (value: string | Node | Function) => {
		switch (typeof value) {
			case "object":
				return value ? value.textContent : "";
			case "function":
				return ToString(value());
		}
		return value;
	};

function* extractParts(a: (string | undefined)[]) {
	if (a.length % PatternSize != 1) {
		console.error("Error matching target pattern", a);
		return;
	}
	const j = a.length - 1;
	for (let i = 0; i < j;) {
		if (a[i])
			yield a[i];
		yield a.slice(i + 1, i += PatternSize);
	}
	if (a[j])
		yield a[j];
}

type Data = {
	[x: string]: any;
};

type Funcs = {
	[x: string]: (data?: any) => any;
};

type Methods = {
	[x: string]: (e: Event) => any;
};

type TargetData = {
	[x: string]: Set<Node>;
};

export class Cydon {
	private _filters: Funcs;
	data: Data;
	queue = new Set<Node>();
	vals = new Map<Node, string[]>();
	targets: TargetData = {};
	methods: Methods;
	filters: Funcs;

	constructor(data: Data = {}, methods: Methods = {}) {
		this.filters = new Proxy(this._filters = {}, {
			set: (obj, prop: string, handler: Function) => {
				obj[prop] = handler;
				this.updateValue(prop);
				return true;
			}
		});
		this.data = new Proxy(data, {
			get(obj, prop: string) {
				return prop in obj ? obj[prop] : "$" + prop;
			},
			set: (obj, prop: string, value) => {
				obj[prop] = value;
				this.updateValue(prop);
				return true;
			}
		});
		this.methods = methods;
	}
	// 绑定元素
	bind(element: Element) {
		// Find pattern in child TextNodes
		for (let n of element.childNodes)
			if (n.nodeType == 3) {
				let vals = (n as Text).data.split(RE);
				if (vals.length < PatternSize) continue;
				for (const part of extractParts(vals))
					if (typeof part == "string")
						element.insertBefore(new Text(part), n);
					else {
						const key = part[0];
						let node = new Text(key);
						element.insertBefore(node, n);
						this.vals.set(node, part);
						this.add(key, node);
						if (part[1])
							this.add(part.join("@"), node);
					}
				element.removeChild(n);
			}
		const attrs = element.attributes;
		// Find pattern in child Attributes
		for (let i = 0; i < attrs.length; ++i) {
			const { name, value } = attrs[i];
			if (name == "data-model" || name == "data-model.lazy")
				element.addEventListener(name == "data-model" ? "input" : "change", e => {
					let newValue = (e.target as HTMLInputElement).value,
						prop = value;
					if (this.data[prop] != newValue)
						this.data[prop] = newValue;
				});
			else if (name[0] == "@") {
				element.addEventListener(name.slice(1), this.methods[value].bind(this.data));
				element.removeAttribute(name);
				--i;
			} else {
				let vals = value.split(RE);
				this.vals.set(attrs[i], vals);
				if (vals.length < PatternSize) continue;
				for (let p of extractParts(vals))
					if (typeof p == "object") {
						this.add(p[0], attrs[i]);
						if (p[1]) this.add(p.join("@"), attrs[i]);
					}
			}
		}
		// Find pattern in child elements
		for (let c of element.children)
			this.bind(c);
		this.updateQueued();
	}

	add(key: string, node: Node) {
		this.targets[key] = (this.targets[key] || new Set<Node>()).add(node);
		this.queue.add(node);
	}

	// 解绑
	unbind(element: Element, searchChildren = true) {
		for (const prop in this.targets) {
			const nodes = this.targets[prop];
			nodes.delete(element);
			for (const node of nodes) {
				if (node instanceof Attr) {
					if (node.ownerElement == element)
						nodes.delete(node);
				} else
					if (searchChildren && element.contains(node))
						nodes.delete(node);
			}
			if (nodes.size == 0)
				delete this.targets[prop];
		}
		for (const c of element.children)
			this.unbind(c, false);
	}

	update(node: Node) {
		const vals = this.vals.get(node);
		if (node instanceof Attr) {
			let str = "";
			for (let p of extractParts(vals))
				str += typeof p == "object" ? ToString(this.getValue(p)) : p;
			node.value = str;
		} else {
			const newValue = this.getValue(vals) as Node;
			import("morphdom").then(module => module.default(node,
				newValue instanceof HTMLElement ? newValue.cloneNode(true) : ToString(newValue),
				{
					onBeforeElUpdated: (fromEl, toEl) => !fromEl.isEqualNode(toEl)
				})).catch(() =>
					(node as ChildNode).replaceWith(newValue instanceof HTMLElement ?
						newValue.cloneNode(true) : ToString(newValue))
				);
		}
	}

	updateValue(prop: string) {
		if (this.targets[prop]) {
			if (this.queue.size == 0)
				requestAnimationFrame(() => this.updateQueued());
			for (const node of this.targets[prop])
				this.queue.add(node);
		}
	}

	updateQueued() {
		for (const node of this.queue)
			this.update(node);
		this.queue.clear();
	}

	getValue([prop, filter]: string[]) {
		const val = this.data[prop];
		return filter in this._filters ? this._filters[filter](val) : val;
	}
}
