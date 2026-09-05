import { Router, type IRouter } from "express";
import healthRouter from "./health";
import remittancesRouter from "./remittances";

const router: IRouter = Router();

router.use(healthRouter);
router.use(remittancesRouter);

export default router;
