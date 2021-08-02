import { render } from '@testing-library/react';

import Homepage from './Homepage';

describe('Ui', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Homepage />);
    expect(baseElement).toBeTruthy();
  });
});
