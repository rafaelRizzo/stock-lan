import type { FastifyRequest, FastifyReply } from 'fastify'
import { handleError } from '../../utils/handlers/handler.errors'
import * as StockEntryService from './stockEntries.service'
import { createStockEntrySchema, idParamSchema } from './schemas/stockEntries.schemas'
import { z } from 'zod'

const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
})

export const createStockEntry = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createStockEntrySchema.parse(req.body)
        const entry = await StockEntryService.createStockEntry(data, req.user.id)
        return reply.status(201).send({ success: true, message: 'Entrada registrada com sucesso.', entry_id: entry.id })
    } catch (error) { return handleError(reply, error) }
}

export const getStockEntries = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { limit, offset } = listQuerySchema.parse(req.query)
        const entries = await StockEntryService.getAllStockEntries(limit, offset)
        return reply.status(200).send({ success: true, message: 'Entradas encontradas.', entries })
    } catch (error) { return handleError(reply, error) }
}

export const getStockEntryById = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const entry = await StockEntryService.getStockEntryById(id)
        if (!entry) return reply.status(404).send({ success: false, message: 'Entrada não encontrada.' })
        return reply.status(200).send({ success: true, message: 'Entrada encontrada.', entry })
    } catch (error) { return handleError(reply, error) }
}

export const deleteStockEntry = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        await StockEntryService.deleteStockEntry(id, req.user.id)
        return reply.status(200).send({ success: true, message: 'Entrada estornada e removida com sucesso.' })
    } catch (error) { return handleError(reply, error) }
}
