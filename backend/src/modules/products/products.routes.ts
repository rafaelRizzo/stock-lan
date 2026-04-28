import { type FastifyInstance } from 'fastify'
import * as ProductController from './products.controller'
import { verifyToken } from '../../middlewares/auth.middleware'

export async function productRoutes(app: FastifyInstance) {
    app.post('/products', { preHandler: verifyToken }, ProductController.createProduct)
    app.get('/products', { preHandler: verifyToken }, ProductController.getProducts)
    app.get('/products/:id', { preHandler: verifyToken }, ProductController.getProductById)
    app.get('/products/:id/movements', { preHandler: verifyToken }, ProductController.getProductMovements)
    app.put('/products/:id', { preHandler: verifyToken }, ProductController.updateProduct)
    app.delete('/products/:id', { preHandler: verifyToken }, ProductController.deleteProduct)
}
