// @ts-nocheck
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import { AgentNamingService, AgentMetadata, AgentCapability } from 'agent-name-service';
import { NotificationService } from './notification-service';
import { MetricsCollector } from './metrics';
import { Logger } from './logger';

class NotificationAgent {
  private app: express.Application;
  private ans: AgentNamingService;
  private notificationService: NotificationService;
  private metrics: MetricsCollector;
  private logger: Logger;
  private isRegistered: boolean = false;

  constructor() {
    this.app = express();
    this.logger = new Logger('notification-agent');
    this.metrics = new MetricsCollector();
    this.notificationService = new NotificationService(this.logger);
    
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
        version: '1.1.0'
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', this.metrics.getContentType());
      res.end(this.metrics.getMetrics());
    });

    // Send notification
    this.app.post('/api/v1/notify', async (req, res) => {
      try {
        const { type, severity, message, recipients, metadata } = req.body;
        
        this.logger.info('Notification request received', { type, severity, recipients });
        
        const result = await this.notificationService.sendNotification({
          type,
          severity,
          message,
          recipients,
          metadata
        });
        
        res.json({
          success: true,
          notificationId: result.notificationId,
          status: result.status,
          timestamp: new Date().toISOString()
        });
      } 
      catch (error: any) {
        this.logger.error('Notification failed', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get notification status
    this.app.get('/api/v1/notify/:notificationId', async (req, res) => {
      try {
        const { notificationId } = req.params;
        const status = await this.notificationService.getNotificationStatus(notificationId);
        
        res.json({
          notificationId,
          status,
          timestamp: new Date().toISOString()
        });
      } catch (error:any) {
        this.logger.error('Failed to get notification status', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // List notification channels
    this.app.get('/api/v1/channels', async (req, res) => {
      try {
        const channels = await this.notificationService.getAvailableChannels();
        res.json({
          channels,
          timestamp: new Date().toISOString()
        });
      } catch (error:any) {
        this.logger.error('Failed to get channels', { error: error.message });
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

    // Schedule periodic health checks
    cron.schedule('0 */1 * * *', async () => {
      this.logger.info('Running scheduled notification health check');
      try {
        await this.notificationService.performHealthCheck();
      } catch (error:any) {
        this.logger.error('Scheduled health check failed', { error: error.message });
      }
    });
  }

  public async start(): Promise<void> {
    try {
      // Register with ANS
      const metadata: AgentMetadata = {
        name: 'notification-agent',
        version: '1.1.0',
        capabilities: [
          {
            name: 'notification',
            version: '1.0.0',
            description: 'Multi-channel notification and alerting service',
            permissions: ['notification:send', 'channel:read', 'alert:create']
          }
        ],
        provider: 'mlops-team',
        endpoints: [
          {
            protocol: 'http',
            address: 'notification-agent.ans-demo.svc.cluster.local',
            port: 8080,
            path: '/api/v1'
          }
        ],
        environment: 'production',
        securityClearance: 2
      };

      await (this.ans as any).registerAgent(metadata);
      
      // Start HTTP server
      const port = process.env.PORT || 8080;
      this.app.listen(port, () => {
        this.logger.info(`Notification Agent started on port ${port}`);
      });
    } catch (error:any) {
      this.logger.error('Failed to start Notification Agent', { error: error.message });
      process.exit(1);
    }
  }
}

// Start the agent
const agent = new NotificationAgent();
agent.start().catch((error) => {
  console.error('Failed to start agent:', error);
  process.exit(1);
});
