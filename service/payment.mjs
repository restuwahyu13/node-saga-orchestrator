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
			data: body.data,
			message: 'Request'
		})

		return { eventCommand, data }
	}

	async Execute(eventCommand, data) {
		let body = data[data.length - 1]
		const checkBalance = await this._checkBalance(body)

		if (eventCommand == 'PAYMENT_REQUESTED') {
			if (checkBalance) {
				eventCommand = 'ORCHESTRATOR_REQUESTED'
				const debitPayment = await this._debitPayment(body)

				body.replyTo = 'PAYMENT_SUCCEED'
				body.message = 'Success'
				body.data.debitPayment = debitPayment
			} else {
				eventCommand = 'ORCHESTRATOR_REQUESTED'
				const refundAmount = await this._refundAmount(body)

				body.replyTo = 'PAYMENT_FAILED'
				body.message = 'Failed'
				body.data.refundAmount = refundAmount
			}

			data.push(body)
		}

		return { eventCommand, data }
	}

	async _checkBalance(body) {
		const isSucceed = process.argv[process.argv.length - 1] == '--rules=success' ? true : false

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
}
