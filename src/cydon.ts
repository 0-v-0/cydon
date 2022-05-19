/*
 * Cydon v0.0.1
 * https://github.com/0-v-0/cydon
 */

const RE = /\$(\{[\S\s]*?\})|\$([_a-zA-Z][_a-zA-Z0-9\.]*)(@[_a-zA-Z][_a-zA-Z0-9]*)?/,
	PatternSize = 4,
	ToString = (value: string | Node | Function) => {
		switch (typeof value) {
			case "object":
				return value ? value.textContent : "";
			case "function":
				return ToString(value());
		}
		return value;
	};

function* extractParts(a: string[]): Generator<string | TargetValue, void, unknown> {
	if (a.length % PatternSize != 1)
		throw new Error("Error matching target pattern");
	const j = a.length - 1;
	for (let i = 0; i < j; i += PatternSize) {
		if (a[i])
			yield a[i];
		if (a[i + 1])
			yield [a[i + 1], Function("return " + a[i + 1].slice(1, -1))];
		else
			yield [a[i + 2], a[i + 3] || ""];
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
	[x: string]: (this: Data, e: Event) => any;
};

type TargetData = {
	node: Node;
	deps: Set<string>;
	vals: TargetValue | (string | TargetValue)[]
};

type TargetValue = [string, (string | Function)?];

export class Cydon {
	private _filters: Funcs;
	_data: Data;
	data: Data;
	queue = new Set<TargetData>();
	targets = new Map<Node, TargetData>();
	methods: Methods;
	filters: Funcs;

	constructor(data: Data = {}, methods: Methods = {}) {
		this.filters = new Proxy(this._filters = {}, {
			set: (obj, prop: string, handler: Function) => {
				obj[prop] = handler;
				this.updateValue("@" + prop);
				return true;
			}
		});
		this._data = data;
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
		const depsWalker = ({ node }: TargetData) => new Proxy(this._data, {
			get: (obj, prop: string) => {
				this.targets.get(node)?.deps.add(prop);
				return prop in obj ? obj[prop] : "$" + prop;
			}
		});
		// Find pattern in child TextNodes
		for (let n of element.childNodes)
			if (n.nodeType == 3) {
				const vals = (n as Text).data.split(RE);
				if (vals.length < PatternSize) continue;
				for (const p of extractParts(vals)) {
					const node = new Text();
					if (typeof p == "string")
						node.data = p;
					else {
						const [key, val] = p,
							deps = new Set<string>(),
							data: TargetData = { node, deps, vals: p };
						if (typeof val == "string") {
							node.data = key;
							deps.add(key);
							if (val)
								deps.add(val);
						} else
							p[1] = val.bind(depsWalker(data));
						this.add(data);
					}
					element.insertBefore(node, n);
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
				element.addEventListener(name.slice(1),
					(this.methods[value] || Function("e", value)).bind(this.data));
				element.removeAttribute(name);
				--i;
			} else {
				let vals: any[] = value.split(RE);
				if (vals.length < PatternSize) continue;
				vals = [...extractParts(vals)];
				const deps = new Set<string>(),
					data: TargetData = { node: attrs[i], deps, vals };
				for (let j = 0; j < vals.length; ++j) {
					const p = vals[j];
					if (typeof p == "object") {
						const [key, val] = p;
						if (typeof val == "string") {
							deps.add(key);
							if (val)
								deps.add(val);
						} else
							p[1] = val.bind(depsWalker(data));
					}
				}
				this.add(data);
			}
		}
		// Find pattern in child elements
		for (let c of element.children)
			this.bind(c);
		this.updateQueued();
	}

	add(data: TargetData) {
		this.targets.set(data.node, data);
		this.queue.add(data);
	}

	// 解绑
	unbind(element: Element, searchChildren = true) {
		const targets = this.targets;
		for (let [node] of targets) {
			if (node instanceof Attr) {
				if (node.ownerElement == element)
					targets.delete(node);
			} else
				if (searchChildren && element.contains(node))
					targets.delete(node);
		}
		for (const c of element.children)
			this.unbind(c, false);
	}

	update(data: TargetData) {
		const { node } = data;
		if (data)
			if (node instanceof Attr) {
				let str = "";
				for (let p of data.vals)
					str += typeof p == "object" ? ToString(this.getValue(p)) : p;
				node.value = str;
			} else {
				let newValue = this.getValue(data.vals as TargetValue) as Node;
				newValue = newValue instanceof HTMLElement ? newValue.cloneNode(true) : new Text(ToString(newValue));
				import("morphdom").then(module => module.default(node, newValue, {
					onBeforeElUpdated: (fromEl, toEl) => !fromEl.isEqualNode(toEl)
				})).catch(() => {
					this.targets.delete(node);
					(node as ChildNode).replaceWith(newValue);
					data.node = newValue;
					this.targets.set(newValue, data);
				});
			}
	}

	updateValue(prop: string) {
		if (this.queue.size == 0)
			requestAnimationFrame(() => this.updateQueued());
		for (const [, data] of this.targets)
			if (data.deps.has(prop))
				this.queue.add(data);
	}

	updateQueued() {
		for (const node of this.queue)
			this.update(node);
		this.queue.clear();
	}

	getValue([prop, filter]: TargetValue) {
		if (typeof filter != "string")
			return filter;
		const val = this.data[prop];
		filter = filter.substring(1);
		return filter in this._filters ? this._filters[filter](val) : val;
	}
}
