import type { FastifyRequest, FastifyReply } from 'fastify'
import { handleError } from '../../utils/handlers/handler.errors'
import * as DebtorService from './debtors.service'
import { createDebtorSchema, updateDebtorSchema, idParamSchema, listDebtorsQuerySchema, debtorSummaryQuerySchema } from './schemas/debtors.schemas'

export const createDebtor = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createDebtorSchema.parse(req.body)
        const debtor = await DebtorService.createDebtor(data)
        return reply.status(201).send({ success: true, message: 'Devedor criado com sucesso.', debtor_id: debtor.id })
    } catch (error) { return handleError(reply, error) }
}

export const getDebtors = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { limit, offset, status } = listDebtorsQuerySchema.parse(req.query)
        const debtors = await DebtorService.getAllDebtors(limit, offset, status)
        return reply.status(200).send({ success: true, message: 'Devedores encontrados.', debtors })
    } catch (error) { return handleError(reply, error) }
}

export const getDebtorById = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const debtor = await DebtorService.getDebtorById(id)
        if (!debtor) return reply.status(404).send({ success: false, message: 'Devedor não encontrado.' })
        return reply.status(200).send({ success: true, message: 'Devedor encontrado.', debtor })
    } catch (error) { return handleError(reply, error) }
}

export const getDebtorSummary = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const query = debtorSummaryQuerySchema.parse(req.query)
        const summary = await DebtorService.getDebtorSummary(id, query)
        if (!summary) return reply.status(404).send({ success: false, message: 'Devedor não encontrado.' })
        return reply.status(200).send({ success: true, message: 'Resumo do devedor.', debtor: summary })
    } catch (error) { return handleError(reply, error) }
}

export const updateDebtor = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const data = updateDebtorSchema.parse(req.body)
        const debtor = await DebtorService.getDebtorById(id)
        if (!debtor) return reply.status(404).send({ success: false, message: 'Devedor não encontrado.' })
        const updated = await DebtorService.updateDebtor(id, data)
        return reply.status(200).send({ success: true, message: 'Devedor atualizado com sucesso.', debtor: updated })
    } catch (error) { return handleError(reply, error) }
}

export const deleteDebtor = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        await DebtorService.deleteDebtor(id)
        return reply.status(200).send({ success: true, message: 'Devedor excluído com sucesso.' })
    } catch (error) { return handleError(reply, error) }
}
