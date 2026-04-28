import type { FastifyRequest, FastifyReply } from 'fastify'
import { handleError } from '../../utils/handlers/handler.errors'
import * as StockMovementService from './stockMovements.service'
import { stockMovementFiltersSchema } from './schemas/stockMovements.schemas'

export const getStockMovements = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const filters = stockMovementFiltersSchema.parse(req.query)
        const movements = await StockMovementService.getStockMovements(filters)
        return reply.status(200).send({ success: true, message: 'Movimentações encontradas.', movements })
    } catch (error) { return handleError(reply, error) }
}
