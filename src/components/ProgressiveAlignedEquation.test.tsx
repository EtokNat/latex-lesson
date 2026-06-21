import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import ProgressiveAlignedEquation from './ProgressiveAlignedEquation';

vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn((latex: string) => `<span class="katex-mock">${latex.length} chars</span>`),
  },
}));

describe('ProgressiveAlignedEquation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts without throwing with a simple equation', () => {
    const { container } = render(
      <ProgressiveAlignedEquation
        equationString="x^2 + y^2 = 1"
        revealCount={0}
      />
    );
    expect(container.querySelector('.progressive-aligned-equation')).toBeTruthy();
  });

  it('mounts with an aligned environment', () => {
    const { container } = render(
      <ProgressiveAlignedEquation
        equationString={String.raw`\begin{aligned} x &= 1 \\ y &= 2 \end{aligned}`}
        revealCount={3}
      />
    );
    expect(container.querySelector('.progressive-aligned-equation')).toBeTruthy();
  });

  it('renders different output for different revealCount values', () => {
    const { container: c1, unmount } = render(
      <ProgressiveAlignedEquation equationString="a + b = c" revealCount={0} />
    );
    const html1 = c1.innerHTML;
    unmount();

    const { container: c2 } = render(
      <ProgressiveAlignedEquation equationString="a + b = c" revealCount={5} />
    );
    const html2 = c2.innerHTML;

    expect(html1).not.toBe(html2);
  });

  it('handles empty equation string gracefully', () => {
    expect(() => {
      render(
        <ProgressiveAlignedEquation equationString="" revealCount={0} />
      );
    }).not.toThrow();
  });

  it('handles inline displayMode', () => {
    const { container } = render(
      <ProgressiveAlignedEquation
        equationString="E = mc^2"
        revealCount={2}
        displayMode="inline"
      />
    );
    expect(container.querySelector('.progressive-aligned-equation')).toBeTruthy();
  });
});
