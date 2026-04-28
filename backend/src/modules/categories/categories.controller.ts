import type { FastifyRequest, FastifyReply } from 'fastify'
import { handleError } from '../../utils/handlers/handler.errors'
import * as CategoryService from './categories.service'
import { createCategorySchema, updateCategorySchema, idParamSchema } from './schemas/categories.schemas'

export const createCategory = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = createCategorySchema.parse(req.body)
        const category = await CategoryService.createCategory(data)
        return reply.status(201).send({ success: true, message: 'Categoria criada com sucesso.', category_id: category.id })
    } catch (error) { return handleError(reply, error) }
}

export const getCategories = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const categories = await CategoryService.getAllCategories()
        return reply.status(200).send({ success: true, message: 'Categorias encontradas.', categories })
    } catch (error) { return handleError(reply, error) }
}

export const getCategoryById = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const category = await CategoryService.getCategoryById(id)
        if (!category) return reply.status(404).send({ success: false, message: 'Categoria não encontrada.' })
        return reply.status(200).send({ success: true, message: 'Categoria encontrada.', category })
    } catch (error) { return handleError(reply, error) }
}

export const updateCategory = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const data = updateCategorySchema.parse(req.body)
        const category = await CategoryService.getCategoryById(id)
        if (!category) return reply.status(404).send({ success: false, message: 'Categoria não encontrada.' })
        const updated = await CategoryService.updateCategory(id, data)
        return reply.status(200).send({ success: true, message: 'Categoria atualizada com sucesso.', category: updated })
    } catch (error) { return handleError(reply, error) }
}

export const deleteCategory = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { id } = idParamSchema.parse(req.params)
        const category = await CategoryService.getCategoryById(id)
        if (!category) return reply.status(404).send({ success: false, message: 'Categoria não encontrada.' })
        await CategoryService.deleteCategory(id)
        return reply.status(200).send({ success: true, message: 'Categoria deletada com sucesso.' })
    } catch (error) { return handleError(reply, error) }
}
