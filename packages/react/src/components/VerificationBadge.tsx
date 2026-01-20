/**
 * Badge component to display verification result
 */

import React from 'react';
import styled from '@emotion/styled';
import type { VerificationResult } from '@aura-network/verifier-sdk';
import type { ComponentBaseProps, BadgeSize, BadgeVariant } from '../types/index.js';
import { defaultTheme } from '../utils/theme.js';

export interface VerificationBadgeProps extends ComponentBaseProps {
  /** Verification result */
  result: VerificationResult | null;
  /** Badge size */
  size?: BadgeSize;
  /** Badge variant */
  variant?: BadgeVariant;
  /** Show details */
  showDetails?: boolean;
}

const BadgeContainer = styled.div<{
  isValid: boolean;
  size: BadgeSize;
  variant: BadgeVariant;
}>`
  display: inline-flex;
  align-items: center;
  gap: ${defaultTheme.spacing.sm};
  padding: ${(props) => {
    switch (props.size) {
      case 'sm':
        return `${defaultTheme.spacing.xs} ${defaultTheme.spacing.sm}`;
      case 'lg':
        return `${defaultTheme.spacing.sm} ${defaultTheme.spacing.md}`;
      default:
        return `${defaultTheme.spacing.xs} ${defaultTheme.spacing.md}`;
    }
  }};
  border-radius: ${defaultTheme.borderRadius.full};
  font-size: ${(props) => {
    switch (props.size) {
      case 'sm':
        return defaultTheme.fontSize.xs;
      case 'lg':
        return defaultTheme.fontSize.md;
      default:
        return defaultTheme.fontSize.sm;
    }
  }};
  font-weight: ${defaultTheme.fontWeight.medium};
  background-color: ${(props) => {
    if (props.variant === 'solid') {
      return props.isValid ? defaultTheme.colors.success : defaultTheme.colors.error;
    }
    if (props.variant === 'subtle') {
      return props.isValid ? `${defaultTheme.colors.success}20` : `${defaultTheme.colors.error}20`;
    }
    return 'transparent';
  }};
  color: ${(props) => {
    if (props.variant === 'solid') {
      return defaultTheme.colors.text.inverse;
    }
    return props.isValid ? defaultTheme.colors.success : defaultTheme.colors.error;
  }};
  border: ${(props) => {
    if (props.variant === 'outline') {
      const color = props.isValid ? defaultTheme.colors.success : defaultTheme.colors.error;
      return `2px solid ${color}`;
    }
    return 'none';
  }};
`;

const Icon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const Details = styled.div`
  margin-top: ${defaultTheme.spacing.xs};
  font-size: ${defaultTheme.fontSize.xs};
  opacity: 0.8;
`;

/**
 * Display verification result as a badge
 *
 * @example
 * ```tsx
 * <VerificationBadge
 *   result={verificationResult}
 *   size="md"
 *   variant="solid"
 *   showDetails
 * />
 * ```
 */
export function VerificationBadge({
  result,
  size = 'md',
  variant = 'solid',
  showDetails = false,
  className,
  style,
}: VerificationBadgeProps): JSX.Element {
  if (!result) {
    return (
      <BadgeContainer
        isValid={false}
        size={size}
        variant={variant}
        className={className}
        style={style}
      >
        <Icon>⏳</Icon>
        <span>Pending</span>
      </BadgeContainer>
    );
  }

  return (
    <div>
      <BadgeContainer
        isValid={result.isValid}
        size={size}
        variant={variant}
        className={className}
        style={style}
      >
        <Icon>{result.isValid ? '✓' : '✗'}</Icon>
        <span>{result.isValid ? 'Verified' : 'Failed'}</span>
      </BadgeContainer>
      {showDetails && (
        <Details>
          {result.isValid ? (
            <>
              <div>Method: {result.verificationMethod}</div>
              <div>Credentials: {result.vcDetails.length}</div>
              <div>Verified at: {result.verifiedAt.toLocaleString()}</div>
            </>
          ) : (
            <div>Error: {result.verificationError}</div>
          )}
        </Details>
      )}
    </div>
  );
}
