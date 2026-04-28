import { type FastifyInstance } from 'fastify'
import * as SupplierController from './suppliers.controller'
import { verifyToken } from '../../middlewares/auth.middleware'

export async function supplierRoutes(app: FastifyInstance) {
    app.post('/suppliers', { preHandler: verifyToken }, SupplierController.createSupplier)
    app.get('/suppliers', { preHandler: verifyToken }, SupplierController.getSuppliers)
    app.get('/suppliers/:id', { preHandler: verifyToken }, SupplierController.getSupplierById)
    app.put('/suppliers/:id', { preHandler: verifyToken }, SupplierController.updateSupplier)
    app.delete('/suppliers/:id', { preHandler: verifyToken }, SupplierController.deleteSupplier)
}
