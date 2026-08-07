import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main menu', () => {
  render(<App />);
  expect(screen.getByText(/Killing for Pie!/i)).toBeInTheDocument();
});
