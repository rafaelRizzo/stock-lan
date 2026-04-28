import { type FastifyInstance } from 'fastify'
import * as StockEntryController from './stockEntries.controller'
import { verifyToken } from '../../middlewares/auth.middleware'

export async function stockEntryRoutes(app: FastifyInstance) {
    app.post('/stock-entries', { preHandler: verifyToken }, StockEntryController.createStockEntry)
    app.get('/stock-entries', { preHandler: verifyToken }, StockEntryController.getStockEntries)
    app.get('/stock-entries/:id', { preHandler: verifyToken }, StockEntryController.getStockEntryById)
    app.delete('/stock-entries/:id', { preHandler: verifyToken }, StockEntryController.deleteStockEntry)
}
