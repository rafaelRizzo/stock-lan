import type { FastifyRequest, FastifyReply } from 'fastify'
import { handleError } from '../../utils/handlers/handler.errors'
import * as StockExitService from './stockExits.service'
import { createStockExitSchema, idParamSchema, listExitsQuerySchema, updatePaymentStatusSchema } from './schemas/stockExits.schemas'

export const createStockExit = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createStockExitSchema.parse(req.body)
        const exit = await StockExitService.createStockExit(data, req.user.id)
        return reply.status(201).send({ success: true, message: 'Saída registrada com sucesso.', exit_id: exit.id })
    } catch (error) { return handleError(reply, error) }
}

export const getStockExits = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { limit, offset, payment_status, debtor_id } = listExitsQuerySchema.parse(req.query)
        const exits = await StockExitService.getAllStockExits(limit, offset, payment_status, debtor_id)
        return reply.status(200).send({ success: true, message: 'Saídas encontradas.', exits })
    } catch (error) { return handleError(reply, error) }
}

export const getStockExitById = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const exit = await StockExitService.getStockExitById(id)
        if (!exit) return reply.status(404).send({ success: false, message: 'Saída não encontrada.' })
        return reply.status(200).send({ success: true, message: 'Saída encontrada.', exit })
    } catch (error) { return handleError(reply, error) }
}

export const updatePaymentStatus = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const data = updatePaymentStatusSchema.parse(req.body)
        const exit = await StockExitService.updatePaymentStatus(id, data)
        return reply.status(200).send({ success: true, message: 'Status de pagamento atualizado.', exit })
    } catch (error) { return handleError(reply, error) }
}

export const deleteStockExit = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        await StockExitService.deleteStockExit(id, req.user.id)
        return reply.status(200).send({ success: true, message: 'Saída estornada e removida com sucesso.' })
    } catch (error) { return handleError(reply, error) }
}
