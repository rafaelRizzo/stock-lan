import type { FastifyRequest, FastifyReply } from 'fastify'
import { handleError } from '../../utils/handlers/handler.errors'
import * as ProductService from './products.service'
import { createProductSchema, updateProductSchema, idParamSchema } from './schemas/products.schemas'
import { z } from 'zod'

const movementsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
})

export const createProduct = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createProductSchema.parse(req.body)
        const product = await ProductService.createProduct(data)
        return reply.status(201).send({ success: true, message: 'Produto criado com sucesso.', product_id: product.id })
    } catch (error) { return handleError(reply, error) }
}

export const getProducts = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const products = await ProductService.getAllProducts()
        return reply.status(200).send({ success: true, message: 'Produtos encontrados.', products })
    } catch (error) { return handleError(reply, error) }
}

export const getProductById = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const product = await ProductService.getProductById(id)
        if (!product) return reply.status(404).send({ success: false, message: 'Produto não encontrado.' })
        return reply.status(200).send({ success: true, message: 'Produto encontrado.', product })
    } catch (error) { return handleError(reply, error) }
}

export const updateProduct = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const data = updateProductSchema.parse(req.body)
        const product = await ProductService.getProductById(id)
        if (!product) return reply.status(404).send({ success: false, message: 'Produto não encontrado.' })
        const updated = await ProductService.updateProduct(id, data)
        return reply.status(200).send({ success: true, message: 'Produto atualizado com sucesso.', product: updated })
    } catch (error) { return handleError(reply, error) }
}

export const deleteProduct = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const product = await ProductService.getProductById(id)
        if (!product) return reply.status(404).send({ success: false, message: 'Produto não encontrado.' })
        await ProductService.deleteProduct(id)
        return reply.status(200).send({ success: true, message: 'Produto deletado com sucesso.' })
    } catch (error) { return handleError(reply, error) }
}

export const getProductMovements = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const { limit, offset } = movementsQuerySchema.parse(req.query)
        const data = await ProductService.getProductMovements(id, limit, offset)
        return reply.status(200).send({ success: true, message: 'Movimentações encontradas.', ...data })
    } catch (error) { return handleError(reply, error) }
}
