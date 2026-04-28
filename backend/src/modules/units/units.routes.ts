import { type FastifyInstance } from 'fastify'
import * as UnitController from './units.controller'
import { verifyToken } from '../../middlewares/auth.middleware'

export async function unitRoutes(app: FastifyInstance) {
    app.post('/units', { preHandler: verifyToken }, UnitController.createUnit)
    app.get('/units', { preHandler: verifyToken }, UnitController.getUnits)
    app.get('/units/:id', { preHandler: verifyToken }, UnitController.getUnitById)
    app.put('/units/:id', { preHandler: verifyToken }, UnitController.updateUnit)
    app.delete('/units/:id', { preHandler: verifyToken }, UnitController.deleteUnit)
}
