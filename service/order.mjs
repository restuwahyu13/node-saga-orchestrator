import { LowDB } from '../helpers/db.mjs'

let eventCommand = ''
let corellationId = ''
let data = []
let db = new LowDB()

export class OrderService {
	constructor() {
		eventCommand = 'ORCHESTRATOR_REQUESTED'
		corellationId = 'abcde-12345'
	}

	async Request(eventCommand, request) {
		if (data.length > 0) {
			data = []
		}

		const body = {
			replyTo: 'ORDER_REQUESTED',
			corellationId: corellationId,
			data: { ...request, status: 'pending', created_at: new Date().toISOString() },
			message: 'Request'
		}

		await db.Insert('order', body.data)
		data.push(body)

		return { eventCommand, data }
	}

	async Execute(eventCommand) {
		let body = data[data.length - 1]

		if (eventCommand == 'ORDER_REQUESTED') {
			if (body.data.product_id > 0) {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'ORDER_SUCCEED'
				body.message = 'Success'
			} else {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'ORDER_FAILED'
				body.message = 'Failed'
			}

			data.push(body)
		}

		return { eventCommand, data }
	}

	async Reply(eventCommand, data = []) {
		switch (eventCommand) {
			case 'ORDER_SAGA':
				let index = data.indexOf(data[data.length - 1])
				let body = data[index]

				this._succeed(body)
				this._failed(body)

				data.push(body)
		}

		return { data }
	}

	async _succeed(body) {
		if (body.replyTo == 'ORDER_SUCCEED') {
			await db.Update('order', body.data.product_id, { status: 'succeed' })
		} else if (body.replyTo == 'STOCK_SUCCEED') {
			await db.Update('stock', body.data.product_id, { qty: body.data.subtractStock })
		} else if (body.replyTo == 'PAYMENT_SUCCEED') {
			await db.Update('payment', body.data.user_id, { balance: body.data.debitPayment })
		}

		this._screen('SUCCEED', 'COMMIT')
	}

	async _failed(body) {
		if (body.replyTo == 'ORDER_FAILED') {
			await db.Update('order', body.data.product_id, { status: 'failed' })
		} else if (body.replyTo == 'STOCK_FAILED') {
			body.replyTo = 'ORDER_FAILED'
			await db.Update('stock', body.data.product_id, { qty: body.data.rollbackStock })
			this.Reply('ORDER_SAGA', data.concat([body]))
		} else if (body.replyTo == 'PAYMENT_FAILED') {
			body.replyTo = 'STOCK_FAILED'
			await db.Update('payment', body.data.user_id, { balance: body.data.refundAmount })
			this.Reply('ORDER_SAGA', data.concat([body]))
		}

		this._screen('FAILED', 'ROLLBACK')
	}

	_screen(status, type) {
		const datetime = new Date().toISOString()

		console.clear()
		console.log(`OrderService - ORDER_${status} ${type} - ${new Date().toISOString(datetime)}`)
		console.log(`OrderService - STOCK_${status} ${type} - ${new Date().toISOString(datetime)}`)
		console.log(`OrderService - PAYMENT_${status} ${type} - ${new Date().toISOString(datetime)}`)
	}
}
