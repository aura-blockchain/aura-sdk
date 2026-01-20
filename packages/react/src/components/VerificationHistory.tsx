/**
 * Component to display verification history
 */

import React from 'react';
import styled from '@emotion/styled';
import type { ComponentBaseProps } from '../types/index.js';
import type { VerificationHistoryItem } from '../types/index.js';
import { defaultTheme, getVCStatusColor } from '../utils/theme.js';

export interface VerificationHistoryProps extends ComponentBaseProps {
  /** List of verification history items */
  items: VerificationHistoryItem[];
  /** Callback when item is clicked */
  onItemClick?: (item: VerificationHistoryItem) => void;
  /** Maximum items to display */
  maxItems?: number;
  /** Empty state message */
  emptyMessage?: string;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${defaultTheme.spacing.sm};
  background-color: ${defaultTheme.colors.background.primary};
  border-radius: ${defaultTheme.borderRadius.md};
  padding: ${defaultTheme.spacing.md};
`;

const Title = styled.h3`
  margin: 0 0 ${defaultTheme.spacing.md} 0;
  font-size: ${defaultTheme.fontSize.lg};
  font-weight: ${defaultTheme.fontWeight.semibold};
  color: ${defaultTheme.colors.text.primary};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${defaultTheme.spacing.sm};
`;

const Item = styled.div<{ clickable: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${defaultTheme.spacing.md};
  background-color: ${defaultTheme.colors.background.card};
  border: 1px solid ${defaultTheme.colors.border};
  border-radius: ${defaultTheme.borderRadius.md};
  cursor: ${(props) => (props.clickable ? 'pointer' : 'default')};
  transition: all 0.2s ease;

  &:hover {
    ${(props) =>
      props.clickable &&
      `
      border-color: ${defaultTheme.colors.primary};
      box-shadow: ${defaultTheme.shadows.sm};
    `}
  }
`;

const ItemContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${defaultTheme.spacing.xs};
  flex: 1;
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${defaultTheme.spacing.sm};
`;

const StatusBadge = styled.span<{ isValid: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${defaultTheme.spacing.xs} ${defaultTheme.spacing.sm};
  border-radius: ${defaultTheme.borderRadius.full};
  font-size: ${defaultTheme.fontSize.xs};
  font-weight: ${defaultTheme.fontWeight.medium};
  background-color: ${(props) =>
    props.isValid ? `${defaultTheme.colors.success}20` : `${defaultTheme.colors.error}20`};
  color: ${(props) => (props.isValid ? defaultTheme.colors.success : defaultTheme.colors.error)};
`;

const DID = styled.div`
  font-size: ${defaultTheme.fontSize.sm};
  font-weight: ${defaultTheme.fontWeight.medium};
  color: ${defaultTheme.colors.text.primary};
  font-family: monospace;
`;

const ItemDetails = styled.div`
  display: flex;
  gap: ${defaultTheme.spacing.md};
  font-size: ${defaultTheme.fontSize.xs};
  color: ${defaultTheme.colors.text.secondary};
`;

const Timestamp = styled.div`
  font-size: ${defaultTheme.fontSize.xs};
  color: ${defaultTheme.colors.text.secondary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${defaultTheme.spacing.xl};
  color: ${defaultTheme.colors.text.secondary};
  font-size: ${defaultTheme.fontSize.sm};
`;

/**
 * Display verification history list
 *
 * @example
 * ```tsx
 * <VerificationHistory
 *   items={historyItems}
 *   onItemClick={(item) => console.log('Clicked:', item)}
 *   maxItems={10}
 * />
 * ```
 */
export function VerificationHistory({
  items,
  onItemClick,
  maxItems,
  emptyMessage = 'No verification history',
  className,
  style,
}: VerificationHistoryProps): JSX.Element {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  if (items.length === 0) {
    return (
      <Container className={className} style={style}>
        <Title>Verification History</Title>
        <EmptyState>{emptyMessage}</EmptyState>
      </Container>
    );
  }

  return (
    <Container className={className} style={style}>
      <Title>Verification History</Title>
      <List>
        {displayItems.map((item) => (
          <Item key={item.id} clickable={!!onItemClick} onClick={() => onItemClick?.(item)}>
            <ItemContent>
              <ItemHeader>
                <StatusBadge isValid={item.result.isValid}>
                  {item.result.isValid ? 'Verified' : 'Failed'}
                </StatusBadge>
                <DID>{truncateDID(item.holderDID)}</DID>
              </ItemHeader>
              <ItemDetails>
                <span>Method: {item.verificationMethod}</span>
                <span>VCs: {item.result.vcDetails.length}</span>
                <span>Latency: {item.result.networkLatency}ms</span>
              </ItemDetails>
            </ItemContent>
            <Timestamp>{formatTimestamp(item.timestamp)}</Timestamp>
          </Item>
        ))}
      </List>
    </Container>
  );
}

/**
 * Truncate DID for display
 */
function truncateDID(did: string): string {
  if (did.length <= 20) {
    return did;
  }
  return `${did.slice(0, 10)}...${did.slice(-8)}`;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}
