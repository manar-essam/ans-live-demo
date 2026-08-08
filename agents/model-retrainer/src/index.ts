// @ts-nocheck
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import { AgentNamingService, AgentMetadata, AgentCapability } from 'agent-name-service';
import { ModelRetrainer } from './model-retrainer';
import { MetricsCollector } from './metrics';
import { Logger } from './logger';

class ModelRetrainerAgent {
  private app: express.Application;
  private ans: AgentNamingService;
  private retrainer: ModelRetrainer;
  private metrics: MetricsCollector;
  private logger: Logger;
  private isRegistered: boolean = false;

  constructor() {
    this.app = express();
    this.logger = new Logger('model-retrainer');
    this.metrics = new MetricsCollector();
    this.retrainer = new ModelRetrainer(this.logger);
    
    this.ans = new AgentNamingService({
      registryUrl: process.env.ANS_REGISTRY_URL || 'http://ans-registry.ans-system.svc.cluster.local',
      caCert: process.env.ANS_CA_CERT_PATH,
      agentCert: process.env.ANS_AGENT_CERT_PATH,
      agentKey: process.env.ANS_AGENT_KEY_PATH
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(this.metrics.middleware());
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        registered: this.isRegistered,
        version: '1.2.0'
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', this.metrics.getContentType());
      res.end(this.metrics.getMetrics());
    });

    // Retrain model
    this.app.post('/api/v1/retrain', async (req, res) => {
      try {
        const { modelId, dataSource, trigger } = req.body;
        
        this.logger.info('Model retraining requested', { modelId, dataSource, trigger });
        
        const result = await this.retrainer.retrainModel(modelId, dataSource, trigger);
        
        res.json({
          success: true,
          modelId,
          retrainId: result.retrainId,
          status: result.status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Model retraining failed', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get retraining status
    this.app.get('/api/v1/retrain/:retrainId', async (req, res) => {
      try {
        const { retrainId } = req.params;
        const status = await this.retrainer.getRetrainStatus(retrainId);
        
        res.json({
          retrainId,
          status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Failed to get retraining status', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // List available models
    this.app.get('/api/v1/models', async (req, res) => {
      try {
        const models = await this.retrainer.getAvailableModels();
        res.json({
          models,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Failed to get models', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private setupEventHandlers(): void {
    // Handle ANS registration events
    this.ans.on('registered', () => {
      this.isRegistered = true;
      this.logger.info('Successfully registered with ANS');
    });

    this.ans.on('registrationFailed', (error) => {
      this.logger.error('ANS registration failed', { error: error.message });
    });

    // Schedule periodic model health checks
    cron.schedule('0 */6 * * *', async () => {
      this.logger.info('Running scheduled model health check');
      try {
        await this.retrainer.performHealthCheck();
      } catch (error) {
        this.logger.error('Scheduled health check failed', { error: error.message });
      }
    });
  }

  public async start(): Promise<void> {
    try {
      // Register with ANS
      const metadata: AgentMetadata = {
        name: 'model-retrainer',
        version: '1.2.0',
        capabilities: [
          {
            name: 'model-retraining',
            version: '1.0.0',
            description: 'Automated model retraining based on drift detection',
            permissions: ['model:read', 'model:write', 'data:read']
          }
        ],
        provider: 'mlops-team',
        endpoints: [
          {
            protocol: 'http',
            address: 'model-retrainer.ans-demo.svc.cluster.local',
            port: 8080,
            path: '/api/v1'
          }
        ],
        environment: 'production',
        securityClearance: 3
      };

      await this.ans.register(metadata);
      
      // Start HTTP server
      const port = process.env.PORT || 8080;
      this.app.listen(port, () => {
        this.logger.info(`Model Retrainer Agent started on port ${port}`);
      });
    } catch (error) {
      this.logger.error('Failed to start Model Retrainer Agent', { error: error.message });
      process.exit(1);
    }
  }
}

// Start the agent
const agent = new ModelRetrainerAgent();
agent.start().catch((error) => {
  console.error('Failed to start agent:', error);
  process.exit(1);
});
