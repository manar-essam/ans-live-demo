import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export class MetricsCollector {
  private notificationCounter: Counter;
  private notificationDuration: Histogram;
  private activeNotifications: Gauge;
  private notificationErrors: Counter;
  private channelCounter: Counter;

  constructor() {
    // Collect default metrics
    collectDefaultMetrics();

    // Custom metrics
    this.notificationCounter = new Counter({
      name: 'ans_notifications_total',
      help: 'Total number of notifications sent',
      labelNames: ['type', 'severity', 'channel', 'status']
    });

    this.notificationDuration = new Histogram({
      name: 'ans_notification_duration_seconds',
      help: 'Duration of notification operations',
      labelNames: ['type', 'severity', 'channel', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    this.activeNotifications = new Gauge({
      name: 'ans_active_notifications',
      help: 'Number of active notification operations'
    });

    this.notificationErrors = new Counter({
      name: 'ans_notification_errors_total',
      help: 'Total number of notification errors',
      labelNames: ['type', 'channel', 'error_type']
    });

    this.channelCounter = new Counter({
      name: 'ans_notification_channels_total',
      help: 'Total notifications by channel',
      labelNames: ['channel', 'status']
    });
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        
        // Record request metrics
        const route = req.route?.path || req.path;
        const method = req.method;
        const status = res.statusCode;
        
        // You can add more detailed metrics here
      });
      
      next();
    };
  }

  recordNotification(type: string, severity: string, channel: string, status: string) {
    this.notificationCounter.inc({ type, severity, channel, status });
    this.channelCounter.inc({ channel, status });
  }

  recordNotificationDuration(type: string, severity: string, channel: string, status: string, duration: number) {
    this.notificationDuration.observe({ type, severity, channel, status }, duration);
  }

  setActiveNotifications(count: number) {
    this.activeNotifications.set(count);
  }

  recordNotificationError(type: string, channel: string, errorType: string) {
    this.notificationErrors.inc({ type, channel, error_type: errorType });
  }

   async getMetrics(): Promise<string> {
    return  register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }
}
