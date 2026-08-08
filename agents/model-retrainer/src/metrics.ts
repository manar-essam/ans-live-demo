// @ts-nocheck
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export class MetricsCollector {
  private retrainCounter: Counter;
  private retrainDuration: Histogram;
  private activeRetrains: Gauge;
  private retrainErrors: Counter;

  constructor() {
    // Collect default metrics
    collectDefaultMetrics();

    // Custom metrics
    this.retrainCounter = new Counter({
      name: 'ans_model_retrains_total',
      help: 'Total number of model retraining requests',
      labelNames: ['model_id', 'trigger', 'status']
    });

    this.retrainDuration = new Histogram({
      name: 'ans_model_retrain_duration_seconds',
      help: 'Duration of model retraining operations',
      labelNames: ['model_id', 'trigger', 'status'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600]
    });

    this.activeRetrains = new Gauge({
      name: 'ans_active_retrains',
      help: 'Number of active retraining operations'
    });

    this.retrainErrors = new Counter({
      name: 'ans_model_retrain_errors_total',
      help: 'Total number of retraining errors',
      labelNames: ['model_id', 'error_type']
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

  recordRetrain(modelId: string, trigger: string, status: string) {
    this.retrainCounter.inc({ model_id: modelId, trigger, status });
  }

  recordRetrainDuration(modelId: string, trigger: string, status: string, duration: number) {
    this.retrainDuration.observe({ model_id: modelId, trigger, status }, duration);
  }

  setActiveRetrains(count: number) {
    this.activeRetrains.set(count);
  }

  recordRetrainError(modelId: string, errorType: string) {
    this.retrainErrors.inc({ model_id: modelId, error_type: errorType });
  }

  getMetrics(): string {
    return register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }
}
