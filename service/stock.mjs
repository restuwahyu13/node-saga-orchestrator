import { LowDB } from '../helpers/db.mjs'

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
			data: { ...body.data, status: 'pending', created_at: new Date().toISOString() },
			message: 'Request'
		})

		return { eventCommand, data }
	}

	async Execute(eventCommand, data) {
		let body = data[data.length - 1]
		const checkStock = await this._findOne(body)

		if (eventCommand == 'STOCK_REQUESTED') {
			if (checkStock) {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'STOCK_SUCCEED'
				body.message = 'Success'
			} else {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'STOCK_FAILED'
				body.message = 'Failed'
			}

			data.push(body)
		}

		return { eventCommand, data }
	}

	async _findOne(body) {
		const isSucceed = process.argv[process.argv.length - 1] == '--rules=success' ? true : false

		const getStock = await db.SelectById('stock', body.data.product_id)
		if (getStock.qty <= 0) return false
		return isSucceed
	}
}
