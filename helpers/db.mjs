import path from 'path'
import { Low } from 'lowdb'
import { JSONFileSync } from 'lowdb/node'

const orderDB = async () => {
	const file = path.resolve(process.cwd(), 'databases/order.json')

	const adapter = new JSONFileSync(file)
	const defaultData = { orders: [] }

	const db = new Low(adapter, defaultData)
	await db.read()

	return db
}

const paymentDB = async () => {
	const file = path.resolve(process.cwd(), 'databases/payment.json')

	const adapter = new JSONFileSync(file)
	const defaultData = { payments: [] }

	const db = new Low(adapter, defaultData)
	await db.read()

	return db
}

const stockDB = async () => {
	const file = path.resolve(process.cwd(), 'databases/stock.json')

	const adapter = new JSONFileSync(file)
	const defaultData = { stocks: [] }

	const db = new Low(adapter, defaultData)
	await db.read()

	return db
}

export class LowDB {
	async Insert(table, data) {
		switch (table) {
			case 'order':
				const order = await orderDB()
				const incrementOrder = order.data.length < 1 ? 1 : order.data[order.data.length - 1].id++

				data.id = incrementOrder
				order.data.unshift(data)

				await order.write()
				return 'Insert new data success'

			case 'payment':
				const payment = await paymentDB()
				const incrementPayment = payment.data.length < 1 ? 1 : payment.data[payment.data.length - 1].id++

				data.id = incrementPayment
				payment.data.unshift(data)

				await payment.write()
				return 'Insert new data success'

			case 'stock':
				const stock = await stockDB()
				const incrementStock = stock.data.length < 1 ? 1 : stock.data[stock.data.length - 1].id++

				data.id = incrementStock
				stock.data.unshift(data)

				await stock.write()
				return 'Insert new data success'

			default:
				return 'Table is not exist'
		}
	}

	async Update(table, id, data) {
		switch (table) {
			case 'order':
				const order = await orderDB()
				const orderIndex = order.data.findIndex((val) => val.product_id == id)

				order.data[orderIndex].product_id = data.product_id ? data.product_id : order.data[orderIndex].product_id
				order.data[orderIndex].status = data.status ? data.status : order.data[orderIndex].status
				order.data[orderIndex].qty = data.qty ? data.qty : order.data[orderIndex].qty

				await order.write()
				return orderIndex == -1 ? 'Updated data success' : 'Updated data failed'

			case 'payment':
				const payment = await paymentDB()
				const paymentIndex = payment.data.findIndex((val) => val.user_id == id)

				payment.data[paymentIndex].balance = data.balance ? data.balance : payment.data[paymentIndex].balance

				await payment.write()
				return paymentIndex == -1 ? 'Updated data success' : 'Updated data failed'

			case 'stock':
				const stock = await stockDB()
				const stockIndex = stock.data.findIndex((val) => val.id == id)

				stock.data[stockIndex].name = data.name ? data.name : stock.data[stockIndex].name
				stock.data[stockIndex].category = data.category ? data.category : stock.data[stockIndex].category
				stock.data[stockIndex].price = data.price ? data.price : stock.data[stockIndex].price
				stock.data[stockIndex].qty = data.qty ? data.qty : stock.data[stockIndex].qty

				await stock.write()
				return stockIndex == -1 ? 'Updated data success' : 'Updated data failed'

			default:
				return 'Table is not exist'
		}
	}

	async Delete(table, id) {
		switch (table) {
			case 'order':
				const order = await orderDB()
				const orderIndex = order.data.findIndex((val) => val.id == id)

				delete order.data[orderIndex]

				await order.write()
				return orderIndex == -1 ? 'Deleted data success' : 'Deleted data failed'

			case 'payment':
				const payment = await paymentDB()
				const paymentIndex = payment.data.findIndex((val) => val.id == id)

				delete payment.data[paymentIndex]

				await payment.write()
				return paymentIndex == -1 ? 'Deleted data success' : 'Deleted data failed'

			case 'stock':
				const stock = await stockDB()
				const stockIndex = payment.data.findIndex((val) => val.id == id)

				delete stock.data[stockIndex]

				await stock.write()
				return stockIndex == -1 ? 'Deleted data success' : 'Deleted data failed'

			default:
				return 'Table is not exist'
		}
	}

	async Select(table) {
		switch (table) {
			case 'order':
				const order = await orderDB()
				return order.data

			case 'payment':
				const payment = await paymentDB()
				return payment.data

			case 'stock':
				const stock = await stockDB()
				return stock.data

			default:
				return 'Table is not exist'
		}
	}

	async SelectById(table, id) {
		switch (table) {
			case 'order':
				const order = await orderDB()
				const orderIndex = order.data.findIndex((val) => val.id == id)

				return orderIndex == -1 ? 'Data not found' : order.data[orderIndex]

			case 'payment':
				const payment = await paymentDB()
				const paymentIndex = payment.data.findIndex((val) => val.id == id)

				return paymentIndex == -1 ? 'Data not found' : payment.data[paymentIndex]

			case 'stock':
				const stock = await stockDB()
				const stockIndex = stock.data.findIndex((val) => val.id == id)

				return stockIndex == -1 ? 'Data not found' : stock.data[stockIndex]

			default:
				return 'Table is not exist'
		}
	}
}
