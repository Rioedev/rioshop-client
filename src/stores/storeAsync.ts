import { getErrorMessage } from "../utils/errorMessage";

type SetState<TState> = (partial: Partial<TState>) => void;

type BooleanKeys<TState> = {
  [K in keyof TState]-?: TState[K] extends boolean ? K : never;
}[keyof TState];

export const runStoreTask = async <TResult>(task: () => Promise<TResult>): Promise<TResult> => {
  try {
    return await task();
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const runStoreTaskWithFlag = async <
  TState extends Record<string, unknown>,
  TFlag extends BooleanKeys<TState>,
  TResult,
>(
  set: SetState<TState>,
  flag: TFlag,
  task: () => Promise<TResult>,
): Promise<TResult> => {
  set({ [flag]: true } as Partial<TState>);
  try {
    return await task();
  } catch (error) {
    throw new Error(getErrorMessage(error));
  } finally {
    set({ [flag]: false } as Partial<TState>);
  }
};

