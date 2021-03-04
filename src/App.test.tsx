import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// import { mockDataSeaports } from './mocks/mockDataSeaports';
// import { mockDataRouteSghRtm } from './mocks/mockDataRouteSghRtm';

test('renders loading screen', () => {
  render(<App />);
  const textElement = screen.getByText(/Loading.../i);
  expect(textElement).toBeInTheDocument();
});
