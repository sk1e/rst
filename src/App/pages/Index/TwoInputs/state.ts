import { makeViewController } from 'rst';

import { parentInterfaceA } from './InputA/state';
import { parentInterfaceB } from './InputB/state';

type S = { value: string };

const twoInputs = makeViewController('TwoInputs')
  .defineStoredState<S>({ value: 'fake' })
  .defineChildren([parentInterfaceA, parentInterfaceB])
  // .defineDerivedState(
  //   'valueLength',
  //   [state => state.value],
  //   (value) => value.length,
  // )
  // .defineDerivedState(
  //   'halfOfValueLength',
  //   [state => state.valueLength],
  //   x => x / 2,
  // )
  .defineEvents(({ makeEvent }) => {
    const setValue = makeEvent(
      'setValue',
      (state, { newValue }: { newValue: string }): S =>
        ({ ...state, value: newValue })
    );

    return [setValue];
  })
 .defineStateDependenciesResolver(tree => ({
   'InputA': { label: tree.InputB.value },
   'InputB': { label: tree.InputA.value },
 }))


  // .defineStateDependenciesResolver(tree => tree)
;

export const { methods, useState } = twoInputs.getViewInterface();
