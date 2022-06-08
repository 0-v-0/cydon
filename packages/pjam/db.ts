import { openDB } from "idb";
import { deleteDB } from "idb";

// IndexedDB本地缓存
export const db = await openDB("pjam", 1, {
	upgrade(db) {
		db.createObjectStore("cache");
	}
}),
	getCache = (url: IDBKeyRange | IDBValidKey) =>
		db?.get("cache", url),
	setCache = (key: IDBKeyRange | IDBValidKey, value: any) =>
		db?.put("cache", value, key),
	clearCache = (delDB?: boolean) => {
		if (delDB)
			return deleteDB("pjam", {
				blocked() {
					console.log("pjamcache: db is in use");
				},
			});
		return db.clear("cache");
	};