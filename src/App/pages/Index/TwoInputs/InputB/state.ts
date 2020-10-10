import { makeViewController } from 'rst';

type S = {
  value: string;
};

const inputB = makeViewController('InputB')
  .defineStoredState<S>({value: 'i am B' })
  .defineStateDependency<'label', string >('label')
  .defineDerivedState(
    'valueLength',
    [state => state.value],
    (value) => value.length,
  )
  .defineDerivedState(
    'halfOfValueLength',
    [state => state.valueLength],
    x => x / 2,
  )
  .defineEvents(({makeEvent}) => {
    const setValue = makeEvent(
      'setValue',
      (state, {newValue}: {newValue: string}): S =>
        ({...state, value: newValue})
    );

    return [setValue];
  }).getPublicInterface();

export const { methods, useState } = inputB.getViewInterface();
export const parentInterface = inputB.getParentInterface();
