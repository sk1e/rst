import { makeViewController } from 'rst';

type S = {};

const LengthOfAllInputs = makeViewController('LengthOfAllInputs')
  .defineStoredState<S>({})
  .defineStateDependency<'lengthOfFirst', number>('lengthOfFirst')
  .defineStateDependency<'lengthOfSecond', number>('lengthOfSecond')
  .defineDerivedState('text',
    [
      state => state.lengthOfFirst,
      state => state.lengthOfSecond,
    ],
    (a, b) => `${a} + ${b} -> ${a + b}`,
  ).getPublicInterface();

export const { methods, useState } = LengthOfAllInputs.getViewInterface();
export const parentInterface = LengthOfAllInputs.getParentInterface();
