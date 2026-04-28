import { type FastifyInstance } from 'fastify'
import * as CategoryController from './categories.controller'
import { verifyToken } from '../../middlewares/auth.middleware'

export async function categoryRoutes(app: FastifyInstance) {
    app.post('/categories', { preHandler: verifyToken }, CategoryController.createCategory)
    app.get('/categories', { preHandler: verifyToken }, CategoryController.getCategories)
    app.get('/categories/:id', { preHandler: verifyToken }, CategoryController.getCategoryById)
    app.put('/categories/:id', { preHandler: verifyToken }, CategoryController.updateCategory)
    app.delete('/categories/:id', { preHandler: verifyToken }, CategoryController.deleteCategory)
}
