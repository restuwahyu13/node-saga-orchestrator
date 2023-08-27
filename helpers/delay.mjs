export const delay = async (timeout, text) => {
	await new Promise((resolve) => setTimeout(resolve, timeout)).then(console.log(text))
}
