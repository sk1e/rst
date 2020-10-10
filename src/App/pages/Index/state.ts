import { makeViewController } from 'rst';

import { TwoInputs } from './TwoInputs';
import { LengthOfAllInputs } from './LengthOfAllInputs';

type S = {};

// console.log('>>', makeViewController('IndexPage')
//   .defineStoredState<S>({})
//   .defineChildren([TwoInputs, LengthOfAllInputs])

const twoInputs = makeViewController('IndexPage')
  .defineStoredState<S>({ value: 'fake' })
  .defineChildren([TwoInputs, LengthOfAllInputs])

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
 .defineStateDependenciesResolver(tree => ({
   'LengthOfAllInputs': {
     lengthOfFirst: tree.TwoInputs.InputA.valueLength,
     lengthOfSecond: tree.TwoInputs.InputB.valueLength,
   },
 })).getPublicInterface();


  // .defineStateDependenciesResolver(tree => tree)
;

export const { methods, useState, views } = twoInputs.getViewInterface();
