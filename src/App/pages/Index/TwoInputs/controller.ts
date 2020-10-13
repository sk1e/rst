import { makeViewController } from 'rst';

import { InputA } from './InputA';
import { InputB } from './InputB';

type S = { value: string };

const twoInputs = makeViewController('TwoInputs')
  .defineStoredState<S>({ value: 'fake' })
  .defineChildren([InputA, InputB])
  .defineStateDependenciesResolver(tree => ({
    'InputA': { label: tree.InputB.value },
    'InputB': { label: tree.InputA.value },
  }))
  .defineEventDependenciesResolver(tree => ({
    'InputA': { setOtherInputValue: tree.setValue as any }
  }))
  .getPublicInterface();


export const { methods, useState, views } = twoInputs.getViewInterface();
export const parentInterface = twoInputs.getParentInterface();
