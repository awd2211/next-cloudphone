import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Example Test', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Hello Vitest!</div>;

    render(<TestComponent />);

    expect(screen.getByText('Hello Vitest!')).toBeInTheDocument();
  });

  it('should perform basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
