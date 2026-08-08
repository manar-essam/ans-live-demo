import { Logger } from './logger';

export interface NotificationRequest {
  type: 'alert' | 'info' | 'warning' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recipients: string[];
  metadata?: any;
}

export interface NotificationResult {
  notificationId: string;
  status: 'sent' | 'failed' | 'pending';
  channel: string;
  recipient: string;
  timestamp: Date;
  error?: string;
}

export interface NotificationStatus {
  notificationId: string;
  status: 'sent' | 'failed' | 'pending';
  results: NotificationResult[];
  timestamp: Date;
}

export class NotificationService {
  private logger: Logger;
  private notifications: Map<string, NotificationStatus> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async sendNotification(request: NotificationRequest): Promise<{ notificationId: string; status: string }> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const notificationStatus: NotificationStatus = {
      notificationId,
      status: 'pending',
      results: [],
      timestamp: new Date()
    };

    this.notifications.set(notificationId, notificationStatus);
    
    this.logger.info('Sending notification', {
      notificationId,
      type: request.type,
      severity: request.severity,
      recipients: request.recipients.length
    });

    // Send notifications to all recipients
    const promises = request.recipients.map(recipient => 
      this.sendToRecipient(notificationId, request, recipient)
    );

    try {
      const results = await Promise.allSettled(promises);
      
      // Update notification status
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          notificationStatus.results.push(result.value);
        } else {
          notificationStatus.results.push({
            notificationId,
            status: 'failed',
            channel: 'unknown',
            recipient: request.recipients[index],
            timestamp: new Date(),
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Determine overall status
      const hasFailures = notificationStatus.results.some(r => r.status === 'failed');
      notificationStatus.status = hasFailures ? 'failed' : 'sent';

      this.logger.info('Notification completed', {
        notificationId,
        status: notificationStatus.status,
        totalRecipients: request.recipients.length,
        successful: notificationStatus.results.filter(r => r.status === 'sent').length
      });

      return {
        notificationId,
        status: notificationStatus.status
      };
    } catch (error:any ) {
      notificationStatus.status = 'failed';
      this.logger.error('Notification failed', {
        notificationId,
        error: error.message
      });
      throw error;
    }
  }

  private async sendToRecipient(
    notificationId: string, 
    request: NotificationRequest, 
    recipient: string
  ): Promise<NotificationResult> {
    try {
      // Determine channel based on recipient format
      const channel = this.determineChannel(recipient);
      
      this.logger.info(`Sending notification via ${channel}`, {
        notificationId,
        recipient,
        channel
      });

      // Simulate sending notification
      await this.simulateNotificationSending(request, channel, recipient);

      return {
        notificationId,
        status: 'sent',
        channel,
        recipient,
        timestamp: new Date()
      };
    } catch (error:any) {
      this.logger.error('Failed to send notification to recipient', {
        notificationId,
        recipient,
        error: error.message
      });

      return {
        notificationId,
        status: 'failed',
        channel: 'unknown',
        recipient,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  private determineChannel(recipient: string): string {
    if (recipient.includes('@')) {
      return 'email';
    } else if (recipient.startsWith('@') || recipient.startsWith('#')) {
      return 'slack';
    } else if (recipient.startsWith('+')) {
      return 'sms';
    } else {
      return 'webhook';
    }
  }

  private async simulateNotificationSending(
    request: NotificationRequest, 
    channel: string, 
    recipient: string
  ): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate occasional failures
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`Failed to send via ${channel}`);
    }

    this.logger.info(`Notification sent successfully via ${channel}`, {
      recipient,
      type: request.type,
      severity: request.severity
    });
  }

  async getNotificationStatus(notificationId: string): Promise<NotificationStatus> {
    const status = this.notifications.get(notificationId);
    if (!status) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    return status;
  }

  async getAvailableChannels(): Promise<string[]> {
    return ['email', 'slack', 'sms', 'webhook', 'teams'];
  }

  async performHealthCheck(): Promise<void> {
    this.logger.info('Performing notification service health check');
    
    // Simulate health check
    const channels = await this.getAvailableChannels();
    for (const channel of channels) {
      this.logger.info(`Health check for channel: ${channel}`, { status: 'healthy' });
    }
  }
}
