import { CydonElement } from 'cydon'

export class ListElement<T extends {}> extends CydonElement {
    static observedAttributes = ['per-page']
    items: T[] = []
    private _list: T[] = []
    private _perPage = 10
    private _pageNum = 0

    get perPage() {
        return this._perPage
    }
    set perPage(value) {
        this._perPage = +value || 10
        this.list = this._list
    }

    get pageNum() {
        return this._pageNum
    }
    set pageNum(value) {
        this._pageNum = value
        this.list = this._list
    }

    get list() {
        return this._list
    }
    set list(data) {
        this._list = data
        const i = this.pageNum, n = this.perPage
        this.items = data.slice(i * n, i * n + n)
    }

    attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
        if (name == 'per-page')
            this.data.perPage = +newVal || 10
    }
}
