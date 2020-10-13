import { makeViewController } from 'rst';

type S = {
  value: string;
};

const inputA = makeViewController('InputA')
  .defineStoredState<S>({ value: 'i am A' })
  .defineStateDependency<'label', string>('label')
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
  .defineEvents(({ makeEvent }) => {
    const setValue = makeEvent(
      'setValue',
      ({ newValue }: { newValue: string }, state): S =>
        ({ ...state, value: newValue })
    );

    return [setValue];
  })
  .defineEventDependency<'setOtherInputValue', { value: string }>('setOtherInputValue', (args, { state }) => {
    return { value: state.value + args.value };
    // emitters.setValue({newValue: state.value + args.value});
  })
  .getPublicInterface();

export const { methods, useState } = inputA.getViewInterface();
export const parentInterface = inputA.getParentInterface();
