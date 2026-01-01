#!/usr/bin/env tsx

/**
 * Generate a secure webhook secret
 */

import crypto from 'crypto';

console.log('\n='.repeat(60));
console.log('Aura Webhook Server - Secret Generator');
console.log('='.repeat(60));

const secret = crypto.randomBytes(32).toString('hex');

console.log('\nGenerated Webhook Secret:');
console.log('-'.repeat(60));
console.log(secret);
console.log('-'.repeat(60));

console.log('\nAdd this to your .env file:');
console.log(`WEBHOOK_SECRET=${secret}`);

console.log('\nGenerated Admin API Key:');
const apiKey = crypto.randomBytes(32).toString('hex');
console.log('-'.repeat(60));
console.log(apiKey);
console.log('-'.repeat(60));

console.log('\nAdd this to your .env file:');
console.log(`ADMIN_API_KEY=${apiKey}`);

console.log('\n' + '='.repeat(60) + '\n');
