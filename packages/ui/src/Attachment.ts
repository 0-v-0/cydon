// From https://github.com/github/file-attachment-element/blob/main/src/attachment.ts

export default class Attachment {
	file: File
	directory: string | undefined
	state: 'pending' | 'saving' | 'saved'
	id?: string
	href?: string
	name?: string
	percent: number

	static traverse(transfer: DataTransfer, directory: boolean): Promise<Attachment[]> {
		return transferredFiles(transfer, directory)
	}

	static from(files: File[] | Attachment[] | FileList) {
		const result = []
		for (const file of files) {
			if (file instanceof File) {
				result.push(new Attachment(file))
			} else if (file instanceof Attachment) {
				result.push(file)
			} else
				throw new Error('Unexpected type')
		}
		return result
	}

	constructor(file: File, directory?: string) {
		this.file = file
		this.directory = directory
		this.state = 'pending'
		this.percent = 0
	}

	get fullPath() {
		return this.directory ? `${this.directory}/${this.file.name}` : this.file.name
	}

	saving(percent: number) {
		if (this.state != 'pending' && this.state != 'saving')
			throw new Error(`Unexpected transition from ${this.state} to saving`)
		this.state = 'saving'
		this.percent = percent
	}

	saved(attributes?: { id?: string; href?: string; name?: string }) {
		if (this.state != 'pending' && this.state != 'saving')
			throw new Error(`Unexpected transition from ${this.state} to saved`)
		this.state = 'saved'
		this.id = attributes?.id
		this.href = attributes?.href
		this.name = attributes?.name
	}
}

const transferredFiles =
	async (transfer: DataTransfer, directory: boolean) => directory && isDirectory(transfer) ?
		traverse('', roots(transfer)) :
		visible([...(transfer.files || [])]).map(f => new Attachment(f))

const hidden = (file: { name: string }) => file.name.startsWith('.')
const visible = <T extends { name: string }>(files: T[]) => files.filter(file => !hidden(file))
const getFile = (entry: FileSystemFileEntry): Promise<File> =>
	new Promise((resolve, reject) => entry.file(resolve, reject))

function getEntries(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
	return new Promise(function (resolve, reject) {
		const result: FileSystemEntry[] = []
		const reader = entry.createReader()
		const read = () => {
			reader.readEntries(entries => {
				if (entries.length) {
					result.push(...entries)
					read()
				} else {
					resolve(result)
				}
			}, reject)
		}
		read()
	})
}

async function traverse(path: string, entries: FileSystemEntry[]): Promise<Attachment[]> {
	const results = []
	for (const entry of visible(entries)) {
		if (entry.isDirectory)
			results.push(...(await traverse(entry.fullPath,
				await getEntries(<FileSystemDirectoryEntry>entry))))
		else
			results.push(new Attachment(await getFile(<FileSystemFileEntry>entry), path))
	}
	return results
}

function isDirectory(transfer: DataTransfer): boolean {
	return transfer.items &&
		[...transfer.items].some((item: any) => {
			const entry = item.webkitGetAsEntry && item.webkitGetAsEntry()
			return entry && entry.isDirectory
		})
}

function roots(transfer: DataTransfer): FileSystemEntry[] {
	return [...transfer.items]
		.map((item: any) => item.webkitGetAsEntry())
		.filter(entry => entry != null)
}
