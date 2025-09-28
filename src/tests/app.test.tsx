import { render, screen } from '@testing-library/react';
import App from '../ui/App';

describe('App', () => {
  it('renders title', () => {
    render(<App />);
    expect(screen.getByText('Jineng Wuziqi')).toBeInTheDocument();
  });
});
