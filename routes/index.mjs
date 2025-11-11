import { Router } from 'express';
import authRouter from '#root/routes/api/AuthController.mjs';
import cronRouter from '#root/routes/api/CronController.mjs';
import userRouter from '#root/routes/api/UserController.mjs';
import configRouter from '#root/routes/api/ConfigController.mjs';
import aliasRouter from '#root/routes/rest/AliasController.mjs';
import bearerTokenRouter from '#root/routes/rest/BearerController.mjs';
import duplicateRouter from '#root/routes/rest/DuplicateController.mjs';
import scriptRouter from '#root/routes/rest/ScriptController.mjs';
import externalUserRouter from '#root/routes/rest/ExternalController.mjs';
import instituteRouter from '#root/routes/rest/InstituteController.mjs';
import researchEntityRouter from '#root/routes/rest/ResearchEntityController.mjs';
import researchItemRouter from '#root/routes/rest/ResearchItemController.mjs';
import researchItemTypesRouter from '#root/routes/rest/ResearchItemTypesController.mjs';
import schemaRouter from '#root/routes/rest/SchemaController.mjs';
import sourceRouter from '#root/routes/rest/SourceController.mjs';

const router = Router();

router.use('/', authRouter);
router.use('/api', cronRouter);
router.use('/api', userRouter);
router.use('/api', configRouter);

const restApiPrefix = '/api/rest';
router.use(restApiPrefix, aliasRouter);
router.use(restApiPrefix, bearerTokenRouter);
router.use(restApiPrefix, duplicateRouter);
router.use(restApiPrefix, scriptRouter);
router.use(restApiPrefix, externalUserRouter);
router.use(restApiPrefix, instituteRouter);
router.use(restApiPrefix, researchEntityRouter);
router.use(restApiPrefix, researchItemRouter);
router.use(restApiPrefix, researchItemTypesRouter);
router.use(restApiPrefix, schemaRouter);
router.use(restApiPrefix, sourceRouter);

router.all(/\/api\/(.*)/, (_req, res) => {
  res.status(404);
  res.json({ status: 404, message: 'Not Found' });
});
export default router;
