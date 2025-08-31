import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { Express } from 'express';

export function setupSwagger(app: Express) {
  const swaggerPath = path.join(__dirname, '../openapi/queue.yaml');
  const swaggerDoc = YAML.load(swaggerPath);

  // Swagger UI em /docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Queue Smart 4.0 API Documentation'
  }));

  // Servir o YAML em /openapi.yaml
  app.use('/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'application/yaml');
    res.sendFile(path.join(__dirname, '../openapi/queue.yaml'));
  });

  console.log('📚 Swagger UI disponível em /docs');
  console.log('📄 OpenAPI YAML disponível em /openapi.yaml');
}
