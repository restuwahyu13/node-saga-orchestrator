import { LowDB } from '../helpers/db.mjs'

let eventCommand = ''
let corellationId = ''
let data = []
let db = new LowDB()

export class PaymentService {
	constructor() {
		eventCommand = 'ORCHESTRATOR_REQUESTED'
		corellationId = 'abcde-12345'
	}

	Request(eventCommand, request = []) {
		let body = request.data[request.data.length - 1]

		data.push({
			replyTo: 'PAYMENT_REQUESTED',
			corellationId: corellationId,
			data: { ...body.data, status: 'pending', created_at: new Date().toISOString() },
			message: 'Request'
		})

		return { eventCommand, data }
	}

	async Execute(eventCommand, data) {
		let body = data[data.length - 1]
		const checkBalance = await this._findOne(body)

		if (eventCommand == 'PAYMENT_REQUESTED') {
			if (checkBalance) {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'PAYMENT_SUCCEED'
				body.message = 'Success'
			} else {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'PAYMENT_FAILED'
				body.message = 'Failed'
			}

			data.push(body)
		}

		return { eventCommand, data }
	}

	async _findOne(body) {
		const isSucceed = process.argv[process.argv.length - 1] == '--rules=success' ? true : false

		const getStock = await db.SelectById('payment', body.data.user_id)
		if (getStock.balance <= 0) return false
		return isSucceed
	}
}
