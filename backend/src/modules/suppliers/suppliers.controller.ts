import type { FastifyRequest, FastifyReply } from 'fastify'
import { handleError } from '../../utils/handlers/handler.errors'
import * as SupplierService from './suppliers.service'
import { createSupplierSchema, updateSupplierSchema, idParamSchema } from './schemas/suppliers.schemas'

export const createSupplier = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createSupplierSchema.parse(req.body)
        const supplier = await SupplierService.createSupplier(data)
        return reply.status(201).send({ success: true, message: 'Fornecedor criado com sucesso.', supplier_id: supplier.id })
    } catch (error) { return handleError(reply, error) }
}

export const getSuppliers = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const suppliers = await SupplierService.getAllSuppliers()
        return reply.status(200).send({ success: true, message: 'Fornecedores encontrados.', suppliers })
    } catch (error) { return handleError(reply, error) }
}

export const getSupplierById = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const supplier = await SupplierService.getSupplierById(id)
        if (!supplier) return reply.status(404).send({ success: false, message: 'Fornecedor não encontrado.' })
        return reply.status(200).send({ success: true, message: 'Fornecedor encontrado.', supplier })
    } catch (error) { return handleError(reply, error) }
}

export const updateSupplier = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const data = updateSupplierSchema.parse(req.body)
        const supplier = await SupplierService.getSupplierById(id)
        if (!supplier) return reply.status(404).send({ success: false, message: 'Fornecedor não encontrado.' })
        const updated = await SupplierService.updateSupplier(id, data)
        return reply.status(200).send({ success: true, message: 'Fornecedor atualizado com sucesso.', supplier: updated })
    } catch (error) { return handleError(reply, error) }
}

export const deleteSupplier = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const supplier = await SupplierService.getSupplierById(id)
        if (!supplier) return reply.status(404).send({ success: false, message: 'Fornecedor não encontrado.' })
        await SupplierService.deleteSupplier(id)
        return reply.status(200).send({ success: true, message: 'Fornecedor deletado com sucesso.' })
    } catch (error) { return handleError(reply, error) }
}
