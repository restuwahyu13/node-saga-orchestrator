export class Orchestrator {
	Run(eventCommand = '', data = []) {
		// console.log('Start Orchestrator - eventCommand: ', eventCommand)
		// console.log('Start Orchestrator - data: ', JSON.stringify(data))
		// console.log('\n')

		if (eventCommand == 'ORCHESTRATOR_REQUESTED') {
			let body = data[data.length - 1]

			if (body.replyTo == 'ORDER_REQUESTED') {
				eventCommand = 'ORDER_REQUESTED'
			} else if (body.replyTo == 'STOCK_REQUESTED') {
				eventCommand = 'STOCK_REQUESTED'
			} else if (body.replyTo == 'PAYMENT_REQUESTED') {
				eventCommand = 'PAYMENT_REQUESTED'
			}

			if (body.replyTo == 'ORDER_SUCCEED') {
				eventCommand = 'ORDER_SAGA'
			} else if (body.replyTo == 'STOCK_SUCCEED') {
				eventCommand = 'ORDER_SAGA'
			} else if (body.replyTo == 'PAYMENT_SUCCEED') {
				eventCommand = 'ORDER_SAGA'
			}

			if (body.replyTo == 'PAYMENT_FAILED') {
				eventCommand = 'ORDER_SAGA'
			} else if (body.replyTo == 'STOCK_FAILED') {
				eventCommand = 'ORDER_SAGA'
			} else if (body.replyTo == 'ORDER_FAILED') {
				eventCommand = 'ORDER_SAGA'
			}

			if (data.length > 0) {
				data = []
			}

			data.push(body)
		}

		// console.log('End Orchestrator - eventCommand: ', eventCommand)
		// console.log('End Orchestrator - data: ', JSON.stringify(data))
		// console.log('\n')

		return { data, eventCommand }
	}
}
