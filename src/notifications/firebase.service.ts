import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  onModuleInit() {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        this.logger.log('Firebase Admin initialized successfully');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
      // Let it pass during local dev without creds if needed, or throw error.
    }
  }

  /**
   * Sends a push notification to multiple FCM tokens
   */
  async sendPushNotification(tokens: string[], title: string, body: string, data?: { [key: string]: string }) {
    if (!tokens || tokens.length === 0) return;

    let channelId = 'od-general';
    if (title.includes('✅') || title.includes('🎉') || title.includes('Approved')) {
      channelId = 'od-approved';
    } else if (title.includes('❌') || title.includes('Rejected')) {
      channelId = 'od-rejected';
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens,
        android: {
          priority: 'high',
          notification: {
            channelId,
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        this.logger.warn(`Failed to send push to ${response.failureCount} devices. Failed tokens: ${failedTokens.join(', ')}`);
        // We could clean up invalid tokens here if we injected UsersService
      }

      this.logger.debug(`Push sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    } catch (error) {
      this.logger.error('Error sending push notification', error);
    }
  }
}
