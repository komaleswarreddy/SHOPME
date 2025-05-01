import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple component to test
const SimpleComponent = () => <div>Simple Component</div>;

describe('SimpleComponent', () => {
  test('renders SimpleComponent correctly', () => {
    render(<SimpleComponent />);
    expect(screen.getByText('Simple Component')).toBeInTheDocument();
  });
}); 