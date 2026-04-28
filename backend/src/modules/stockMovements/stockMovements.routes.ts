import { type FastifyInstance } from 'fastify'
import * as StockMovementController from './stockMovements.controller'
import { verifyToken } from '../../middlewares/auth.middleware'

export async function stockMovementRoutes(app: FastifyInstance) {
    app.get('/stock-movements', { preHandler: verifyToken }, StockMovementController.getStockMovements)
}
