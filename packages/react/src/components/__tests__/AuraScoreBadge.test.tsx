import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuraScoreBadge } from '../AuraScoreBadge';

describe('AuraScoreBadge', () => {
  it('shows high score styling', () => {
    render(<AuraScoreBadge score={92} />);
    expect(screen.getByText('Aura Score')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
  });

  it('caps score at 0-100 range', () => {
    render(<AuraScoreBadge score={-10} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
