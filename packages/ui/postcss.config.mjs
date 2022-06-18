export default ctx => ({
	map: ctx.env == 'development' ? ctx.map : false,
	plugins: {
		'autoprefixer': ctx.env == 'development' && {}
	}
})