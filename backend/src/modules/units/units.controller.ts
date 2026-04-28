import type { FastifyRequest, FastifyReply } from 'fastify'
import { handleError } from '../../utils/handlers/handler.errors'
import * as UnitService from './units.service'
import { createUnitSchema, updateUnitSchema, idParamSchema } from './schemas/units.schemas'

export const createUnit = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createUnitSchema.parse(req.body)
        const unit = await UnitService.createUnit(data)
        return reply.status(201).send({ success: true, message: 'Unidade criada com sucesso.', unit_id: unit.id })
    } catch (error) { return handleError(reply, error) }
}

export const getUnits = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const units = await UnitService.getAllUnits()
        return reply.status(200).send({ success: true, message: 'Unidades encontradas.', units })
    } catch (error) { return handleError(reply, error) }
}

export const getUnitById = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const unit = await UnitService.getUnitById(id)
        if (!unit) return reply.status(404).send({ success: false, message: 'Unidade não encontrada.' })
        return reply.status(200).send({ success: true, message: 'Unidade encontrada.', unit })
    } catch (error) { return handleError(reply, error) }
}

export const updateUnit = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const data = updateUnitSchema.parse(req.body)
        const unit = await UnitService.getUnitById(id)
        if (!unit) return reply.status(404).send({ success: false, message: 'Unidade não encontrada.' })
        const updated = await UnitService.updateUnit(id, data)
        return reply.status(200).send({ success: true, message: 'Unidade atualizada com sucesso.', unit: updated })
    } catch (error) { return handleError(reply, error) }
}

export const deleteUnit = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const unit = await UnitService.getUnitById(id)
        if (!unit) return reply.status(404).send({ success: false, message: 'Unidade não encontrada.' })
        await UnitService.deleteUnit(id)
        return reply.status(200).send({ success: true, message: 'Unidade deletada com sucesso.' })
    } catch (error) { return handleError(reply, error) }
}
