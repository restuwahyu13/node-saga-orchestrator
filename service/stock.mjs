import { LowDB } from '../helpers/db.mjs'
import { delay } from '../helpers/delay.mjs'

let eventCommand = ''
let corellationId = ''
let data = []
let db = new LowDB()

export class StockService {
	constructor() {
		eventCommand = 'ORCHESTRATOR_REQUESTED'
		corellationId = 'abcde-12345'
	}

	Request(eventCommand, request = []) {
		let body = request.data[request.data.length - 1]

		data.push({
			replyTo: 'STOCK_REQUESTED',
			corellationId: corellationId,
			data: body.data,
			message: 'Request'
		})

		return { eventCommand, data }
	}

	async Execute(eventCommand, data) {
		console.log('\n')
		await delay(2000, 'Checking Stock....')

		let body = data[data.length - 1]
		const checkStock = await this._checkStock(body)

		if (eventCommand == 'STOCK_REQUESTED') {
			if (checkStock) {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'STOCK_SUCCEED'
				body.message = 'Success'

				const subtractStock = await this._subtractStock(body)
				body.data.subtractStock = subtractStock

				await delay(3000, 'Checking Stock Completed')

				console.log('\n')
				await delay(1000, `STOCK COMMIT`)
			} else {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'STOCK_FAILED'
				body.message = 'Failed'

				const rollbackStock = await this._rollbackStock(body)
				body.data.rollbackStock = rollbackStock

				await delay(3000, 'Checking Stock Failed')

				console.log('\n')
				await delay(1000, `STOCK ROLLBACK`)
				await delay(2000, `ORDER ROLLBACK`)
			}

			data.push(body)
		}

		return { eventCommand, data }
	}

	async _checkStock(body) {
		const argv = process.argv[process.argv.length - 1]
		const isSucceed = argv == '--rules=stock-success' ? true : argv == '--rules=stock-failed' ? false : true

		const getStock = await db.SelectById('stock', body.data.product_id)
		if (getStock.qty <= 0) return false
		return isSucceed
	}

	async _subtractStock(body) {
		const getStock = await db.SelectById('stock', body.data.product_id)
		const subtractStock = getStock.qty - body.data.qty
		return subtractStock
	}

	async _rollbackStock(body) {
		let rollbackStock = 0

		const [getOrder, getStock] = await Promise.all([db.SelectById('order', body.data.product_id), db.SelectById('stock', body.data.product_id)])

		if (getOrder) {
			const qty = getStock.qty

			if (qty <= getStock.qty) {
				rollbackStock = getStock.qty + body.data.qty
			}

			rollbackStock = qty
		} else {
			rollbackStock = getStock.qty
		}

		return rollbackStock
	}
}
