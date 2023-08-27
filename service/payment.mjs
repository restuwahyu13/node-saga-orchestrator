import { LowDB } from '../helpers/db.mjs'
import { delay } from '../helpers/delay.mjs'

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
			data: body.data,
			message: 'Request'
		})

		return { eventCommand, data }
	}

	async Execute(eventCommand, data) {
		console.log('\n')
		await delay(2000, 'Payment Inquiry....')

		let body = data[data.length - 1]
		const checkBalance = await this._checkBalance(body)

		if (eventCommand == 'PAYMENT_REQUESTED') {
			if (eventCommand == 'PAYMENT_SUCCEED' || checkBalance) {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'PAYMENT_SUCCEED'
				body.message = 'Success'

				const debitPayment = await this._debitPayment(body)
				body.data.debitPayment = debitPayment

				await delay(3000, 'Payment Success')

				console.log('\n')
				await delay(1000, `PAYMENT COMMIT`)
			} else if (eventCommand == 'PAYMENT_FAILED' || !checkBalance) {
				eventCommand = 'ORCHESTRATOR_REQUESTED'

				body.replyTo = 'PAYMENT_FAILED'
				body.message = 'Failed'

				const rollbackStock = await this._rollbackStock(body)
				body.data.rollbackStock = rollbackStock

				const refundAmount = await this._refundAmount(body)
				body.data.refundAmount = refundAmount

				await delay(3000, 'Payment Failed')

				console.log('\n')
				await delay(1000, `PAYMENT ROLLBACK`)
				await delay(2000, `STOCK ROLLBACK`)
				await delay(3000, `ORDER ROLLBACK`)
			}

			data.push(body)
		}

		return { eventCommand, data }
	}

	async _checkBalance(body) {
		const argv = process.argv[process.argv.length - 1]
		const isSucceed = argv == '--rules=payment-success' ? true : argv == '--rules=payment-failed' ? false : true

		const getStock = await db.SelectById('payment', body.data.user_id)
		if (getStock.balance <= 0) return false
		return isSucceed
	}

	async _debitPayment(body) {
		const getStock = await db.SelectById('stock', body.data.product_id)
		const getPayment = await db.SelectById('payment', body.data.user_id)

		const totalPayment = getStock.price * body.data.qty
		const debitPayment = getPayment.balance - totalPayment

		return debitPayment
	}

	async _refundAmount(body) {
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

		return refundAmount
	}

	async _rollbackStock(body) {
		let rollbackStock = 0

		const [getOrder, getStock] = await Promise.all([db.SelectById('order', body.data.product_id), db.SelectById('stock', body.data.product_id)])

		if (getOrder) {
			rollbackStock = getStock.qty + body.data.qty
		} else {
			rollbackStock = getStock.qty
		}

		return rollbackStock
	}
}
