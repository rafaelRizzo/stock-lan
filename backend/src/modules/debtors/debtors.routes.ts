import { type FastifyInstance } from 'fastify'
import * as DebtorController from './debtors.controller'
import { verifyToken } from '../../middlewares/auth.middleware'

export async function debtorRoutes(app: FastifyInstance) {
    app.post('/debtors', { preHandler: verifyToken }, DebtorController.createDebtor)
    app.get('/debtors', { preHandler: verifyToken }, DebtorController.getDebtors)
    app.get('/debtors/:id', { preHandler: verifyToken }, DebtorController.getDebtorById)
    app.get('/debtors/:id/summary', { preHandler: verifyToken }, DebtorController.getDebtorSummary)
    app.put('/debtors/:id', { preHandler: verifyToken }, DebtorController.updateDebtor)
    app.delete('/debtors/:id', { preHandler: verifyToken }, DebtorController.deleteDebtor)
}
