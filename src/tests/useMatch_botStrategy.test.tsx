import React, { useImperativeHandle } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import useMatch, { type MatchOptions } from '../ui/useMatch';
import { HeuristicBot } from '../ai/heuristicStrategy';
import { RandomBot } from '../ai/randomStrategy';

type UseMatchApi = ReturnType<typeof useMatch>;

const Harness = React.forwardRef<UseMatchApi, { opts: MatchOptions }>((props, ref) => {
  const match = useMatch(props.opts);
  useImperativeHandle(ref, () => match, [match]);
  return null;
});

Harness.displayName = 'UseMatchHarness';

describe('useMatch — bot strategy selection', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('uses the selected bot strategy when starting a match', async () => {
    vi.useFakeTimers();
    const heuristicSpy = vi
      .spyOn(HeuristicBot, 'decide')
      .mockImplementation((_game, drawn) => ({ cardId: drawn[0] ?? 'Place' }));
    const randomSpy = vi
      .spyOn(RandomBot, 'decide')
      .mockImplementation((_game, drawn) => ({ cardId: drawn[0] ?? 'Place' }));

    const ref = React.createRef<UseMatchApi>();
    render(
      <Harness
        ref={ref}
        opts={{
          opponent: 'bot',
          botStrategyId: 'heuristic-v1',
          firstPlayer: 2,
          seed: 'heuristic-seed',
        }}
      />,
    );

    expect(ref.current).toBeTruthy();

    await act(() => {
      vi.runOnlyPendingTimers();
      return Promise.resolve();
    });

    expect(heuristicSpy).toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it('switches to the new bot strategy after resetMatch', async () => {
    vi.useFakeTimers();
    const heuristicSpy = vi
      .spyOn(HeuristicBot, 'decide')
      .mockImplementation((_game, drawn) => ({ cardId: drawn[0] ?? 'Place' }));
    const randomSpy = vi
      .spyOn(RandomBot, 'decide')
      .mockImplementation((_game, drawn) => ({ cardId: drawn[0] ?? 'Place' }));

    const ref = React.createRef<UseMatchApi>();
    render(
      <Harness
        ref={ref}
        opts={{
          opponent: 'bot',
          botStrategyId: 'random-baseline',
          firstPlayer: 2,
          seed: 'initial-seed',
        }}
      />,
    );

    expect(ref.current).toBeTruthy();

    await act(() => {
      vi.runOnlyPendingTimers();
      return Promise.resolve();
    });

    expect(randomSpy).toHaveBeenCalled();
    randomSpy.mockClear();

    await act(() => {
      ref.current?.resetMatch({
        opponent: 'bot',
        botStrategyId: 'heuristic-v1',
        firstPlayer: 2,
        seed: 'reset-seed',
      });
      return Promise.resolve();
    });

    await act(() => {
      vi.runOnlyPendingTimers();
      return Promise.resolve();
    });

    expect(heuristicSpy).toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
  });
});
