import { Router } from 'express';
const router = Router();
//Swagger imports
import swaggerUI from 'swagger-ui-express';
//import swaggerDocument from '../docs/openapi.json' with {type: "json"};
const { default: swaggerDocument } = await import('../docs/openapi.json', {
  with: {type: "json"},
  }
);

/* Swagger docs on "/" route */
router.use('/', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

export default router;
