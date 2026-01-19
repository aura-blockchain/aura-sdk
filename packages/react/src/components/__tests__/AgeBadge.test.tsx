import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgeBadge } from '../AgeBadge';

describe('AgeBadge', () => {
  it('shows verified badge with check icon', () => {
    render(<AgeBadge age={21} verified size="sm" />);
    expect(screen.getByText('21+')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows failed badge with cross icon', () => {
    render(<AgeBadge age={18} verified={false} variant="outline" />);
    expect(screen.getByText('18+')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });
});
