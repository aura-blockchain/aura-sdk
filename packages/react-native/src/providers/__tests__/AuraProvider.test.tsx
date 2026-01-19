import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuraProvider, useAuraContext } from '../AuraProvider';
import { NetworkType } from '../../types';
import { Text, Button } from 'react-native';

const TestConsumer = () => {
  const { network, switchNetwork, isConnected } = useAuraContext();

  return (
    <>
      <Text testID="network">{network}</Text>
      <Text testID="connected">{isConnected ? 'yes' : 'no'}</Text>
      <Button testID="switch-btn" title="Switch" onPress={() => switchNetwork(NetworkType.MAINNET)} />
    </>
  );
};

describe('AuraProvider', () => {
  it('should provide network context', () => {
    render(
      <AuraProvider network={NetworkType.TESTNET}>
        <TestConsumer />
      </AuraProvider>
    );

    expect(screen.getByTestId('network').textContent).toBe('testnet');
  });

  it('should allow network switching', async () => {
    render(
      <AuraProvider network={NetworkType.TESTNET}>
        <TestConsumer />
      </AuraProvider>
    );

    fireEvent.click(screen.getByTestId('switch-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('network').textContent).toBe('mainnet');
    });
  });

  it('should throw when used outside provider', () => {
    const spy = () => render(<TestConsumer />);
    expect(spy).toThrowError();
  });
});
