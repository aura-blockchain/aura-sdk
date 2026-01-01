/**
 * Badge component to display Aura trust score
 */

import React from 'react';
import styled from '@emotion/styled';
import type { ComponentBaseProps, BadgeSize, BadgeVariant } from '../types/index.js';
import { defaultTheme, applyOpacity } from '../utils/theme.js';

export interface AuraScoreBadgeProps extends ComponentBaseProps {
  /** Trust score (0-100) */
  score: number;
  /** Badge size */
  size?: BadgeSize;
  /** Badge variant */
  variant?: BadgeVariant;
  /** Show score label */
  showLabel?: boolean;
}

const BadgeContainer = styled.div<{
  score: number;
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
    const color = getScoreColor(props.score);
    if (props.variant === 'solid') {
      return color;
    }
    if (props.variant === 'subtle') {
      return applyOpacity(color, 0.2);
    }
    return 'transparent';
  }};
  color: ${(props) => {
    if (props.variant === 'solid') {
      return defaultTheme.colors.text.inverse;
    }
    return getScoreColor(props.score);
  }};
  border: ${(props) => {
    if (props.variant === 'outline') {
      return `2px solid ${getScoreColor(props.score)}`;
    }
    return 'none';
  }};
`;

const ScoreValue = styled.span`
  font-weight: ${defaultTheme.fontWeight.bold};
`;

const ProgressBar = styled.div<{ score: number }>`
  width: 60px;
  height: 6px;
  background-color: ${defaultTheme.colors.background.secondary};
  border-radius: ${defaultTheme.borderRadius.full};
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${(props) => props.score}%;
    background-color: ${(props) => getScoreColor(props.score)};
    transition: width 0.3s ease;
  }
`;

/**
 * Get color based on score
 */
function getScoreColor(score: number): string {
  if (score >= 80) {
    return defaultTheme.colors.success;
  }
  if (score >= 60) {
    return defaultTheme.colors.secondary;
  }
  if (score >= 40) {
    return defaultTheme.colors.warning;
  }
  return defaultTheme.colors.error;
}

/**
 * Display Aura trust score badge
 *
 * @example
 * ```tsx
 * <AuraScoreBadge score={85} size="md" variant="solid" showLabel />
 * ```
 */
export function AuraScoreBadge({
  score,
  size = 'md',
  variant = 'solid',
  showLabel = true,
  className,
  style,
}: AuraScoreBadgeProps): JSX.Element {
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <BadgeContainer
      score={clampedScore}
      size={size}
      variant={variant}
      className={className}
      style={style}
    >
      {showLabel && <span>Aura Score</span>}
      <ScoreValue>{clampedScore}</ScoreValue>
      {size !== 'sm' && <ProgressBar score={clampedScore} />}
    </BadgeContainer>
  );
}
