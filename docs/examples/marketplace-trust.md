# Marketplace Trust Verification Example

Complete implementation guide for using the Aura Verifier SDK in peer-to-peer marketplaces like Craigslist, Facebook Marketplace, OfferUp, and similar platforms.

## Table of Contents

- [Overview](#overview)
- [Use Cases](#use-cases)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Integration Examples](#integration-examples)
- [UI/UX Recommendations](#uiux-recommendations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Peer-to-peer marketplaces face significant trust challenges:
- Scammers with fake identities
- Fraudulent buyers/sellers
- Safety concerns for in-person meetups
- Difficulty verifying user credibility

The Aura Verifier SDK enables marketplace platforms to verify user credentials without storing sensitive personal information, creating a safer trading environment while protecting privacy.

**Benefits:**
- **Increased Trust**: Verified users have proven identity
- **Reduced Fraud**: Harder for scammers to operate
- **User Safety**: Verified meetups are safer
- **Privacy-Preserving**: Users control what information is shared

## Use Cases

### 1. Identity Verification

Verify user's real identity when creating an account:

```typescript
// User shares: verified name and city/state only
const disclosureContext = {
  show_full_name: true,
  show_city_state: true,
  // NOT shared: full address, age, SSN, etc.
};
```

**Benefits:**
- Reduces fake accounts
- Builds user trust
- Enables dispute resolution

### 2. Trust Score System

Build reputation based on verified credentials:

```typescript
interface TrustScore {
  identityVerified: boolean;      // +50 points
  ageVerified: boolean;            // +20 points
  addressVerified: boolean;        // +30 points
  credentialCount: number;         // +10 per credential
  accountAge: number;              // Days since verification
  totalScore: number;              // 0-100
}
```

### 3. High-Value Transaction Verification

Require additional verification for expensive items:

```typescript
async function verifyHighValueTransaction(
  sellerId: string,
  itemValue: number
): Promise<boolean> {
  // Items over $500 require identity verification
  if (itemValue > 500) {
    const seller = await getSellerProfile(sellerId);
    return seller.trustScore.identityVerified === true;
  }
  return true;
}
```

### 4. Meetup Safety

Verify both parties before in-person meetups:

```typescript
interface MeetupVerification {
  buyerVerified: boolean;
  sellerVerified: boolean;
  bothParties: boolean;
  safetyScore: number; // 0-100
}
```

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│    User      │────1───>│ Marketplace  │────3───>│  Aura SDK   │
│  (Seller)    │<───2────│   Platform   │<───4────│  (Verify)   │
└──────────────┘         └──────────────┘         └─────────────┘
                                │                         │
                                │                         │
                                5                         6
                                │                         │
                                v                         v
                         ┌──────────────┐         ┌─────────────┐
                         │   Database   │         │ Blockchain  │
                         │ (User Trust) │         │ (Revoke)    │
                         └──────────────┐         └─────────────┘

1. User submits verification QR code
2. Platform displays verification status/badge
3. SDK verifies credential
4. Returns verification result
5. Store trust score in database
6. Check revocation status on blockchain
```

## Implementation

### Step 1: User Profile Verification

```typescript
// user-verification.ts
import { VerifierSDK, parseQRCode } from '@aura-network/verifier-sdk';

interface UserVerification {
  userId: string;
  fullName?: string;
  cityState?: string;
  identityVerified: boolean;
  addressVerified: boolean;
  verificationDate: Date;
  trustScore: number;
}

export async function verifyUserProfile(
  userId: string,
  qrString: string
): Promise<UserVerification> {
  const verifier = new VerifierSDK({
    rpcEndpoint: 'https://rpc.aura.network',
    timeout: 15000
  });

  try {
    // Parse QR code
    const qrData = parseQRCode(qrString);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (qrData.exp < now) {
      throw new Error('Verification expired. Please generate a new QR code.');
    }

    // Verify signature
    const message = JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n
    });

    const sigResult = await verifier.verifySignature({
      publicKey: qrData.h,
      message: message,
      signature: qrData.sig,
      algorithm: 'ed25519'
    });

    if (!sigResult.valid) {
      throw new Error('Invalid signature');
    }

    // Extract verified information
    const verification: UserVerification = {
      userId: userId,
      fullName: qrData.ctx.show_full_name ? extractName(qrData) : undefined,
      cityState: qrData.ctx.show_city_state ? extractLocation(qrData) : undefined,
      identityVerified: qrData.ctx.show_full_name === true,
      addressVerified: qrData.ctx.show_city_state === true ||
                       qrData.ctx.show_full_address === true,
      verificationDate: new Date(),
      trustScore: calculateTrustScore(qrData.ctx)
    };

    // Save to database
    await saveUserVerification(verification);

    return verification;

  } finally {
    await verifier.disconnect();
  }
}

function calculateTrustScore(ctx: DisclosureContext): number {
  let score = 0;

  if (ctx.show_full_name) score += 50;
  if (ctx.show_city_state) score += 20;
  if (ctx.show_full_address) score += 30;

  return Math.min(score, 100);
}

function extractName(qrData: QRCodeData): string {
  // In production, extract from verified credential
  // For now, return placeholder
  return 'Verified User';
}

function extractLocation(qrData: QRCodeData): string {
  // In production, extract from verified credential
  return 'City, State';
}

async function saveUserVerification(verification: UserVerification) {
  // Save to your database
  await db.users.update(verification.userId, {
    verification: verification
  });
}
```

### Step 2: Trust Badge System

```typescript
// trust-badge.ts
interface TrustBadge {
  level: 'none' | 'basic' | 'verified' | 'premium';
  color: string;
  icon: string;
  label: string;
  trustScore: number;
}

export function getTrustBadge(verification: UserVerification): TrustBadge {
  if (!verification.identityVerified) {
    return {
      level: 'none',
      color: '#9E9E9E',
      icon: '○',
      label: 'Unverified',
      trustScore: 0
    };
  }

  const score = verification.trustScore;

  if (score >= 80) {
    return {
      level: 'premium',
      color: '#FFD700',
      icon: '★',
      label: 'Premium Verified',
      trustScore: score
    };
  }

  if (score >= 50) {
    return {
      level: 'verified',
      color: '#4CAF50',
      icon: '✓',
      label: 'Verified',
      trustScore: score
    };
  }

  return {
    level: 'basic',
    color: '#2196F3',
    icon: '○',
    label: 'Basic Verified',
    trustScore: score
  };
}

// React component for trust badge
export function TrustBadgeComponent({ userId }: { userId: string }) {
  const [badge, setBadge] = useState<TrustBadge | null>(null);

  useEffect(() => {
    async function loadBadge() {
      const verification = await getUserVerification(userId);
      if (verification) {
        setBadge(getTrustBadge(verification));
      }
    }
    loadBadge();
  }, [userId]);

  if (!badge) return null;

  return (
    <div className={`trust-badge trust-badge-${badge.level}`}
         style={{ borderColor: badge.color, color: badge.color }}>
      <span className="trust-icon">{badge.icon}</span>
      <span className="trust-label">{badge.label}</span>
      <span className="trust-score">{badge.trustScore}</span>
    </div>
  );
}
```

### Step 3: Transaction Safety Check

```typescript
// transaction-safety.ts
interface SafetyCheck {
  safe: boolean;
  warnings: string[];
  recommendations: string[];
  safetyScore: number; // 0-100
}

export async function checkTransactionSafety(
  buyerId: string,
  sellerId: string,
  itemValue: number
): Promise<SafetyCheck> {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let safetyScore = 100;

  // Check buyer verification
  const buyer = await getUserVerification(buyerId);
  if (!buyer || !buyer.identityVerified) {
    warnings.push('Buyer is not identity verified');
    safetyScore -= 30;
    recommendations.push('Ask buyer to complete identity verification');
  }

  // Check seller verification
  const seller = await getUserVerification(sellerId);
  if (!seller || !seller.identityVerified) {
    warnings.push('Seller is not identity verified');
    safetyScore -= 30;
    recommendations.push('Consider choosing a verified seller');
  }

  // High-value items require stronger verification
  if (itemValue > 500) {
    if (!buyer?.addressVerified) {
      warnings.push('High-value transaction with unverified buyer address');
      safetyScore -= 20;
      recommendations.push('Request address verification for high-value items');
    }

    if (!seller?.addressVerified) {
      warnings.push('High-value transaction with unverified seller address');
      safetyScore -= 20;
      recommendations.push('Verify seller address before proceeding');
    }
  }

  // New accounts are riskier
  if (buyer && isNewAccount(buyer.verificationDate)) {
    warnings.push('Buyer account is recently verified');
    safetyScore -= 10;
    recommendations.push('Use secure payment method');
  }

  // Meetup safety recommendations
  if (safetyScore < 70) {
    recommendations.push('Meet in a public place');
    recommendations.push('Bring a friend');
    recommendations.push('Use secure payment method');
  }

  return {
    safe: safetyScore >= 50,
    warnings,
    recommendations,
    safetyScore: Math.max(0, safetyScore)
  };
}

function isNewAccount(verificationDate: Date): boolean {
  const daysSinceVerification =
    (Date.now() - verificationDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceVerification < 7; // Less than 1 week
}
```

### Step 4: API Endpoints

```typescript
// server.ts
import express from 'express';
import { verifyUserProfile } from './user-verification';
import { checkTransactionSafety } from './transaction-safety';
import { getTrustBadge } from './trust-badge';

const app = express();
app.use(express.json());

// Endpoint: Verify user profile
app.post('/api/verify-profile', async (req, res) => {
  const { userId, qrString } = req.body;

  try {
    const verification = await verifyUserProfile(userId, qrString);

    res.json({
      success: true,
      verification: verification,
      badge: getTrustBadge(verification)
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint: Check transaction safety
app.post('/api/check-safety', async (req, res) => {
  const { buyerId, sellerId, itemValue } = req.body;

  try {
    const safety = await checkTransactionSafety(buyerId, sellerId, itemValue);

    res.json({
      success: true,
      safety: safety
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint: Get user trust score
app.get('/api/trust-score/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const verification = await getUserVerification(userId);

    if (!verification) {
      return res.json({
        verified: false,
        trustScore: 0
      });
    }

    res.json({
      verified: verification.identityVerified,
      trustScore: verification.trustScore,
      badge: getTrustBadge(verification),
      verificationDate: verification.verificationDate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Marketplace verification API running on port 3000');
});
```

## Integration Examples

### React Integration

```typescript
// VerificationFlow.tsx
import React, { useState } from 'react';
import { QRCodeScanner } from './QRCodeScanner';

export function VerificationFlow({ userId }: { userId: string }) {
  const [step, setStep] = useState<'intro' | 'scan' | 'result'>('intro');
  const [verification, setVerification] = useState<any>(null);

  const handleScan = async (qrString: string) => {
    try {
      const response = await fetch('/api/verify-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, qrString })
      });

      const data = await response.json();

      if (data.success) {
        setVerification(data.verification);
        setStep('result');
      } else {
        alert('Verification failed: ' + data.error);
      }
    } catch (error) {
      alert('Verification error: ' + error.message);
    }
  };

  return (
    <div className="verification-flow">
      {step === 'intro' && (
        <div className="intro">
          <h2>Verify Your Identity</h2>
          <p>Increase your trust score and access to the marketplace.</p>
          <ul>
            <li>✓ Get a verified badge on your profile</li>
            <li>✓ Increase trust with buyers/sellers</li>
            <li>✓ Access high-value item listings</li>
            <li>✓ Your privacy is protected - you control what's shared</li>
          </ul>
          <button onClick={() => setStep('scan')}>
            Start Verification
          </button>
        </div>
      )}

      {step === 'scan' && (
        <div className="scan">
          <h2>Scan Your QR Code</h2>
          <p>Open your Aura app and generate a verification QR code</p>
          <QRCodeScanner onScan={handleScan} />
        </div>
      )}

      {step === 'result' && verification && (
        <div className="result">
          <div className="success-icon">✓</div>
          <h2>Verification Complete!</h2>
          <div className="trust-info">
            <div className="trust-score">
              <span className="score-label">Trust Score</span>
              <span className="score-value">{verification.trustScore}</span>
            </div>
            <div className="badge-display">
              <TrustBadgeComponent userId={userId} />
            </div>
          </div>
          <button onClick={() => window.location.href = '/profile'}>
            View Profile
          </button>
        </div>
      )}
    </div>
  );
}
```

### Mobile App Integration (React Native)

```typescript
// VerificationScreen.tsx
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { RNCamera } from 'react-native-camera';

export function VerificationScreen({ userId }: { userId: string }) {
  const [scanning, setScanning] = useState(false);

  const handleBarCodeRead = async ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);

    try {
      const response = await fetch('https://api.yourapp.com/verify-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, qrString: data })
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Verification Complete!',
          `Your trust score is now ${result.verification.trustScore}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Verification Failed', result.error);
        setScanning(true);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setScanning(true);
    }
  };

  return (
    <View style={styles.container}>
      {!scanning ? (
        <View style={styles.intro}>
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.description}>
            Build trust with other users and access more features
          </Text>
          <Button title="Start Verification" onPress={() => setScanning(true)} />
        </View>
      ) : (
        <RNCamera
          style={styles.camera}
          onBarCodeRead={handleBarCodeRead}
          barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        >
          <View style={styles.overlay}>
            <Text style={styles.scanText}>Scan QR code from Aura app</Text>
          </View>
        </RNCamera>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  intro: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  description: { fontSize: 16, color: '#666', marginBottom: 20 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 20 },
  scanText: { color: 'white', fontSize: 18, textAlign: 'center' }
});
```

## UI/UX Recommendations

### Trust Score Display

```css
/* trust-badge.css */
.trust-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 2px solid;
  font-weight: 600;
  font-size: 14px;
}

.trust-badge-none {
  border-color: #9E9E9E;
  color: #9E9E9E;
  background: #F5F5F5;
}

.trust-badge-basic {
  border-color: #2196F3;
  color: #2196F3;
  background: #E3F2FD;
}

.trust-badge-verified {
  border-color: #4CAF50;
  color: #4CAF50;
  background: #E8F5E9;
}

.trust-badge-premium {
  border-color: #FFD700;
  color: #F57C00;
  background: #FFF8E1;
}

.trust-icon {
  font-size: 18px;
}

.trust-score {
  background: rgba(0,0,0,0.1);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}
```

### Safety Warning UI

```typescript
// SafetyWarning.tsx
export function SafetyWarning({ safety }: { safety: SafetyCheck }) {
  if (safety.safe && safety.warnings.length === 0) {
    return (
      <div className="safety-check safety-safe">
        <div className="safety-icon">✓</div>
        <div className="safety-text">
          <strong>Transaction looks safe</strong>
          <p>Both parties are verified</p>
        </div>
      </div>
    );
  }

  return (
    <div className="safety-check safety-warning">
      <div className="safety-icon">⚠</div>
      <div className="safety-text">
        <strong>Safety Score: {safety.safetyScore}/100</strong>

        {safety.warnings.length > 0 && (
          <div className="warnings">
            <p><strong>Warnings:</strong></p>
            <ul>
              {safety.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {safety.recommendations.length > 0 && (
          <div className="recommendations">
            <p><strong>Recommendations:</strong></p>
            <ul>
              {safety.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Best Practices

### 1. Gradual Verification

Don't require full verification immediately:

```typescript
// Progressive disclosure levels
const verificationLevels = {
  level1: {
    required: ['show_city_state'],
    benefits: ['Post listings', 'Browse items']
  },
  level2: {
    required: ['show_full_name', 'show_city_state'],
    benefits: ['Message sellers', 'Make offers']
  },
  level3: {
    required: ['show_full_name', 'show_city_state', 'show_age_over_18'],
    benefits: ['High-value transactions', 'Premium badge']
  }
};
```

### 2. Privacy-First Messaging

Be clear about what's shared:

```
"We'll verify your identity without storing personal information.
You control what gets shared with other users."

✓ Your name and city will be verified
✗ Your full address will NOT be shared
✗ Your exact age will NOT be shared
```

### 3. Incentivize Verification

Offer benefits for verified users:

- Priority in search results
- Access to high-value items
- Lower transaction fees
- Trust badges
- Featured listings

### 4. Regular Re-verification

```typescript
// Require re-verification after 90 days
function needsReverification(user: UserVerification): boolean {
  const daysSinceVerification =
    (Date.now() - user.verificationDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceVerification > 90;
}
```

### 5. Fraud Prevention

```typescript
// Detect suspicious patterns
function detectSuspiciousActivity(userId: string): boolean {
  const checks = [
    hasMultipleFailedVerifications(userId),
    hasRecentlyChangedCredentials(userId),
    hasUnusuallyHighTransactionVolume(userId),
    hasMultipleAccountsFromSameDevice(userId)
  ];

  return checks.some(check => check === true);
}
```

## Troubleshooting

### Issue: Users Don't Complete Verification

**Solutions:**
- Simplify verification flow
- Show clear benefits
- Offer incentives (discounts, featured listings)
- Make optional initially

### Issue: Privacy Concerns

**Solutions:**
- Clear privacy policy
- Show exactly what's shared
- Allow users to choose disclosure level
- Don't store unnecessary data

### Issue: Low Trust Scores

**Solutions:**
- Offer multiple verification paths
- Weight different credentials appropriately
- Allow score to improve over time
- Show progress to 100 score

### Issue: Verification Friction

**Solutions:**
- Allow partial verification
- Save progress
- Offer help/support chat
- Video walkthrough

## Next Steps

- [Bar Age Verification Example](./bar-age-verification.md) - Another use case
- [Security Guide](../security.md) - Secure your platform
- [API Reference](../api-reference.md) - Complete API docs
- [Error Handling](../error-handling.md) - Handle edge cases
