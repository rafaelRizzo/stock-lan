import { type FastifyInstance } from 'fastify'
import * as StockExitController from './stockExits.controller'
import { verifyToken } from '../../middlewares/auth.middleware'

export async function stockExitRoutes(app: FastifyInstance) {
    app.post('/stock-exits', { preHandler: verifyToken }, StockExitController.createStockExit)
    app.get('/stock-exits', { preHandler: verifyToken }, StockExitController.getStockExits)
    app.get('/stock-exits/:id', { preHandler: verifyToken }, StockExitController.getStockExitById)
    app.patch('/stock-exits/:id/payment', { preHandler: verifyToken }, StockExitController.updatePaymentStatus)
    app.delete('/stock-exits/:id', { preHandler: verifyToken }, StockExitController.deleteStockExit)
}
