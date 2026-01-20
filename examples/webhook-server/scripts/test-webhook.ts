#!/usr/bin/env tsx

/**
 * Test webhook script
 * Sends test webhook requests to the server
 */

import crypto from 'crypto';
import { WebhookEventType } from '../src/types/webhook.js';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-secret';

interface TestWebhookOptions {
  eventType: WebhookEventType;
  endpoint: 'verification' | 'revocation';
  data: any;
}

/**
 * Generate webhook signature
 */
function generateSignature(payload: string, secret: string): string {
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${signature}`;
}

/**
 * Send test webhook
 */
async function sendTestWebhook(options: TestWebhookOptions): Promise<void> {
  const payload = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: options.eventType,
    apiVersion: '1.0',
    data: options.data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, WEBHOOK_SECRET);

  const url = `${SERVER_URL}/webhooks/${options.endpoint}`;

  console.log(`\nSending ${options.eventType} to ${url}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('Signature:', signature);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body: payloadString,
    });

    const responseData = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✓ Success');
    } else {
      console.log('✗ Failed');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Aura Webhook Server - Test Script');
  console.log('='.repeat(60));
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Webhook Secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);

  // Test 1: Verification Success
  await sendTestWebhook({
    eventType: WebhookEventType.VERIFICATION_SUCCESS,
    endpoint: 'verification',
    data: {
      credentialId: 'cred_test_123456',
      holderDid: 'did:aura:test:holder123',
      issuerDid: 'did:aura:test:issuer456',
      credentialType: 'IdentityCredential',
      verificationMethod: 'Ed25519Signature2020',
      metadata: {
        testField: 'testValue',
      },
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 2: Verification Failed
  await sendTestWebhook({
    eventType: WebhookEventType.VERIFICATION_FAILED,
    endpoint: 'verification',
    data: {
      credentialId: 'cred_test_123457',
      holderDid: 'did:aura:test:holder124',
      reason: 'Signature verification failed',
      errorCode: 'INVALID_SIGNATURE',
      metadata: {},
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 3: Credential Revoked
  await sendTestWebhook({
    eventType: WebhookEventType.CREDENTIAL_REVOKED,
    endpoint: 'revocation',
    data: {
      credentialId: 'cred_test_123458',
      holderDid: 'did:aura:test:holder125',
      issuerDid: 'did:aura:test:issuer456',
      revokedAt: new Date().toISOString(),
      reason: 'User requested revocation',
      metadata: {},
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 4: Age Verification Passed
  await sendTestWebhook({
    eventType: WebhookEventType.AGE_VERIFICATION_PASSED,
    endpoint: 'verification',
    data: {
      credentialId: 'cred_test_123459',
      holderDid: 'did:aura:test:holder126',
      minimumAge: 18,
      verifiedAge: 25,
      metadata: {},
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 5: Age Verification Failed
  await sendTestWebhook({
    eventType: WebhookEventType.AGE_VERIFICATION_FAILED,
    endpoint: 'verification',
    data: {
      credentialId: 'cred_test_123460',
      holderDid: 'did:aura:test:holder127',
      minimumAge: 21,
      reason: 'Age below minimum required',
      metadata: {},
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 6: Credential Expired
  await sendTestWebhook({
    eventType: WebhookEventType.CREDENTIAL_EXPIRED,
    endpoint: 'revocation',
    data: {
      credentialId: 'cred_test_123461',
      holderDid: 'did:aura:test:holder128',
      issuerDid: 'did:aura:test:issuer456',
      expiredAt: new Date().toISOString(),
      metadata: {},
    },
  });

  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60));
  console.log('\nCheck analytics at:', `${SERVER_URL}/analytics`);
}

main().catch(console.error);
