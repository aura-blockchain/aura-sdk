/**
 * Badge component for age verification
 */

import React from 'react';
import styled from '@emotion/styled';
import type { ComponentBaseProps, BadgeSize, BadgeVariant } from '../types/index.js';
import { defaultTheme } from '../utils/theme.js';

export interface AgeBadgeProps extends ComponentBaseProps {
  /** Required age (18 or 21) */
  age: 18 | 21;
  /** Whether age verification passed */
  verified: boolean;
  /** Badge size */
  size?: BadgeSize;
  /** Badge variant */
  variant?: BadgeVariant;
}

const BadgeContainer = styled.div<{
  verified: boolean;
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
  font-weight: ${defaultTheme.fontWeight.semibold};
  background-color: ${(props) => {
    if (props.variant === 'solid') {
      return props.verified ? defaultTheme.colors.success : defaultTheme.colors.error;
    }
    if (props.variant === 'subtle') {
      return props.verified ? `${defaultTheme.colors.success}20` : `${defaultTheme.colors.error}20`;
    }
    return 'transparent';
  }};
  color: ${(props) => {
    if (props.variant === 'solid') {
      return defaultTheme.colors.text.inverse;
    }
    return props.verified ? defaultTheme.colors.success : defaultTheme.colors.error;
  }};
  border: ${(props) => {
    if (props.variant === 'outline') {
      const color = props.verified ? defaultTheme.colors.success : defaultTheme.colors.error;
      return `2px solid ${color}`;
    }
    return 'none';
  }};
`;

const Icon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
`;

/**
 * Display age verification badge
 *
 * @example
 * ```tsx
 * <AgeBadge age={21} verified={true} size="md" variant="solid" />
 * ```
 */
export function AgeBadge({
  age,
  verified,
  size = 'md',
  variant = 'solid',
  className,
  style,
}: AgeBadgeProps): JSX.Element {
  return (
    <BadgeContainer
      verified={verified}
      size={size}
      variant={variant}
      className={className}
      style={style}
    >
      <Icon>{verified ? '✓' : '✗'}</Icon>
      <span>{age}+</span>
    </BadgeContainer>
  );
}
