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

			console.log('\n')
			console.log('OrderService - ORDER_SUCCEED COMMIT')
			console.log('\n')
		} else if (body.replyTo == 'STOCK_SUCCEED') {
			const getStock = await db.SelectById('stock', body.data.product_id)
			const subtractStock = getStock.qty - body.data.qty

			await db.Update('stock', body.data.product_id, { qty: subtractStock })

			console.log('\n')
			console.log('OrderService - STOCK_SUCCEED COMMIT')
			console.log('\n')
		} else if (body.replyTo == 'PAYMENT_SUCCEED') {
			const getStock = await db.SelectById('stock', body.data.product_id)
			const getPayment = await db.SelectById('payment', body.data.user_id)

			const totalPayment = getStock.price * body.data.qty
			const debitPayment = getPayment.balance - totalPayment

			await db.Update('payment', body.data.product_id, { balance: debitPayment })

			console.log('\n')
			console.log('OrderService - PAYMENT_SUCCEED COMMIT')
			console.log('\n')
		}
	}

	async _failed(body) {
		if (body.replyTo == 'ORDER_FAILED') {
			await db.Update('order', body.data.product_id, { status: 'failed' })

			console.log('\n')
			console.log('OrderService - ORDER_FAILED ROLLBACK')
			console.log('\n')
		} else if (body.replyTo == 'STOCK_FAILED') {
			let rollbackStock = 0

			const [getOrder, getStock] = await Promise.all([
				db.SelectById('order', body.data.product_id),
				db.SelectById('stock', body.data.product_id)
			])

			if (getOrder) {
				const qty = getStock.qty

				if (qty <= getStock.qty) {
					rollbackStock = getStock.qty + body.data.qty
				}

				rollbackStock = qty
			} else {
				rollbackStock = getStock.qty
			}

			body.replyTo = 'ORDER_FAILED'
			await db.Update('stock', getStock.id, { qty: rollbackStock })
			this.Reply('ORDER_SAGA', data.concat([body]))

			console.log('\n')
			console.log('OrderService - STOCK_FAILED ROLLBACK')
			console.log('\n')
		} else if (body.replyTo == 'PAYMENT_FAILED') {
			let refundAmount = 0

			const [getOrder, getStock, getPayment] = await Promise.all([
				db.SelectById('order', body.data.product_id),
				db.SelectById('stock', body.data.product_id),
				db.SelectById('payment', body.data.user_id)
			])

			if (getOrder) {
				const balance = getPayment.balance

				if (balance <= getPayment.balance) {
					const totalPrice = getStock.price * body.data.qty
					refundAmount = getPayment.balance + totalPrice
				}

				refundAmount = balance
			} else {
				refundAmount = getPayment.balance
			}

			body.replyTo = 'STOCK_FAILED'
			await db.Update('payment', body.data.user_id, { balance: refundAmount })
			this.Reply('ORDER_SAGA', data.concat([body]))

			console.log('\n')
			console.log('OrderService - PAYMENT_FAILED ROLLBACK')
			console.log('\n')
		}
	}
}
