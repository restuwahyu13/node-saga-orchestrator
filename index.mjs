import { Orchestrator } from './orchestrator.mjs'
import { OrderService } from './service/order.mjs'
import { StockService } from './service/stock.mjs'
import { PaymentService } from './service/payment.mjs'

// main
;(async () => {
	const argv = process.argv[process.argv.length - 1]

	if (['--rules=order-success', '--rules=order-failed'].includes(argv)) {
		await OrderServiceQueue()
	} else if (['--rules=stock-success', '--rules=stock-failed'].includes(argv)) {
		const orderRes = await OrderServiceQueue()
		await StockServiceQueue(orderRes)
	} else if (['--rules=payment-success', '--rules=payment-failed'].includes(argv)) {
		const orderRes = await OrderServiceQueue()
		const stockRes = await StockServiceQueue(orderRes)
		await PaymentServiceQueue(stockRes)
	}
})()

async function OrderServiceQueue() {
	const orchestratorService = new Orchestrator()
	const orderService = new OrderService()

	const orderRequestRes = await orderService.Request('ORCHESTRATOR_REQUESTED', { user_id: 1, product_id: 1, qty: 3 })
	const orchestratorRes1 = orchestratorService.Run(orderRequestRes.eventCommand, orderRequestRes.data)

	const orderExecuteRes = await orderService.Execute(orchestratorRes1.eventCommand, orchestratorRes1.data)
	const stockRequestRes2 = orchestratorService.Run(orderExecuteRes.eventCommand, orderExecuteRes.data)
	const orderReplyRes = await orderService.Reply(stockRequestRes2.eventCommand, stockRequestRes2.data)

	return orderReplyRes
}

async function StockServiceQueue(orderReply) {
	const orchestratorService = new Orchestrator()
	const orderService = new OrderService()
	const stockService = new StockService()

	const stockRequestRes = stockService.Request('ORCHESTRATOR_REQUESTED', orderReply)
	const orchestratorRes1 = orchestratorService.Run(stockRequestRes.eventCommand, stockRequestRes.data)
	const stockExecuteRes = await stockService.Execute(orchestratorRes1.eventCommand, orchestratorRes1.data)

	const stockRequestRes2 = orchestratorService.Run(stockExecuteRes.eventCommand, stockExecuteRes.data)
	const stockOrderReplyRes = await orderService.Reply(stockRequestRes2.eventCommand, stockRequestRes2.data)
	return stockOrderReplyRes
}

async function PaymentServiceQueue(stockReply) {
	const orchestratorService = new Orchestrator()
	const orderService = new OrderService()
	const paymentService = new PaymentService()

	const paymentRequestRes = paymentService.Request('ORCHESTRATOR_REQUESTED', stockReply)
	const orchestratorRes1 = orchestratorService.Run(paymentRequestRes.eventCommand, paymentRequestRes.data)
	const paymentExecuteRes = await paymentService.Execute(orchestratorRes1.eventCommand, orchestratorRes1.data)

	const stockRequestRes2 = orchestratorService.Run(paymentExecuteRes.eventCommand, paymentExecuteRes.data)
	orderService.Reply(stockRequestRes2.eventCommand, stockRequestRes2.data)
}
