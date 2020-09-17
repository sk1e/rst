import { makeViewController } from './lib';

type S = {
  value: string;
}

// const c = makeStateController<S>({ value: 'privet', n: 1 })
//   .defineDerivedState('len', [(x => x.value)])

export const {useState, methods } = makeViewController('Input')
  .defineStoredState<S>({value: 'privet' })
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
  }).getViewInterface();
