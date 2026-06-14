import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileCard } from './FileCard';

describe('<FileCard />', () => {
  it('renders the file name and a human-readable size', () => {
    render(<FileCard name="holiday.png" size={1_572_864} mime="image/png" />);
    expect(screen.getByText('holiday.png')).toBeInTheDocument();
    expect(screen.getByText(/1\.5 MB/)).toBeInTheDocument();
  });

  it('invokes onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn();
    render(<FileCard name="a.txt" size={10} mime="text/plain" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: /remove file/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('does not render a remove button without a handler', () => {
    render(<FileCard name="a.txt" size={10} mime="text/plain" />);
    expect(screen.queryByRole('button', { name: /remove file/i })).not.toBeInTheDocument();
  });
});
