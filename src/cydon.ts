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

function* identifyParts(a: (string | undefined)[]) {
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

interface TargetData {
	deps?: Set<string>,
	node?: Node;
	prop?: string[];
	attr?: Attr;
	vals?: any[];
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

export class Cydon {
	private _filters: Funcs;
	data: Data;
	targets = new Set<TargetData>();
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
				for (let part of identifyParts(vals)) {
					if (typeof part != "object") {
						element.insertBefore(new Text(part), n);
						continue;
					}
					let node = new Text(part[0]);
					element.insertBefore(node, n);
					let deps = new Set([part[0]]),
						data: TargetData = {
							deps, node, prop: part
						};
					if (part[1])
						deps.add(part.join("@"));
					this.targets.add(data);
					this.update(data);
				}
				element.removeChild(n);
			}
		let attrs = element.attributes;
		// Find pattern in child Attributes
		for (let i = 0; i < attrs.length; ++i) {
			let attr = attrs[i];
			if (attr.name == "data-model" || attr.name == "data-model.lazy")
				element.addEventListener(attr.name == "data-model" ? "input" : "change", e => {
					let newValue = (e.target as HTMLInputElement).value,
						prop = attr.value;
					if (this.data[prop] != newValue)
						this.data[prop] = newValue;
				});
			else if (attr.name[0] == "@") {
				element.addEventListener(attr.name.slice(1), this.methods[attr.value].bind(this.data));
				element.removeAttribute(attr.name);
				--i;
			} else {
				let vals = attr.value.split(RE);
				if (vals.length < PatternSize) continue;
				let parts = identifyParts(vals),
					deps = new Set<string>();
				for (let p of parts)
					if (typeof p == "object") {
						deps.add(p[0]);
						if (p[1]) deps.add(p.join("@"));
					}
				let data: TargetData = {
					deps, attr, vals
				};
				this.targets.add(data);
				this.update(data);
			}
		}
		// Find pattern in child elements
		for (let c of element.children)
			this.bind(c);
	}
	// 解绑
	unbind(element: Element, searchChildNodes = true) {
		for (let t of this.targets) {
			if ((searchChildNodes && t.node && element.contains(t.node)) ||
				(t.attr && [...element.attributes].includes(t.attr)))
				this.targets.delete(t);
		}
		for (let c of element.children)
			this.unbind(c, false);
	}
	*filter(selector: string) {
		for (let t of this.targets)
			if (t.deps.has(selector))
				yield t;
	}

	update(data: TargetData) {
		if (data.node) {
			let newValue = this.getValue(data.prop) as Node;
			import("morphdom").then(module => module.default(data.node,
				newValue instanceof HTMLElement ? newValue.cloneNode(true) : ToString(newValue),
				{
					onBeforeElUpdated: (fromEl, toEl) => !fromEl.isEqualNode(toEl)
				})).catch(() => {
					newValue = newValue instanceof HTMLElement ? newValue.cloneNode(true) :
						new Text(ToString(newValue));
					data.node.parentNode.replaceChild(newValue, data.node);
					data.node = newValue;
				});
		}
		if (data.attr) {
			let str = "";
			for (let p of identifyParts(data.vals))
				str += typeof p == "object" ? ToString(this.getValue(p)) : p;
			data.attr.value = str;
		}
	}
	updateValue(prop: string) {
		for (let l of this.filter(prop))
			this.update(l);
	}
	getValue([prop, filter]: string[]) {
		let val = this.data[prop];
		return filter in this._filters ? this._filters[filter](val) : val;
	}
}
