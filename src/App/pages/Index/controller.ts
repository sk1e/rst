import { makeViewController } from 'rst';

import { TwoInputs } from './TwoInputs';
import { LengthOfAllInputs } from './LengthOfAllInputs';
import { Table } from './Table';

type S = {};

// console.log('>>', makeViewController('IndexPage')
//   .defineStoredState<S>({})
//   .defineChildren([TwoInputs, LengthOfAllInputs])

const twoInputs = makeViewController('IndexPage')
  .defineStoredState<S>({ value: 'fake' })
  .defineChildren([TwoInputs, LengthOfAllInputs, Table])
  // .defineChildren([Table])

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
 }))
  .getPublicInterface();


  // .defineStateDependenciesResolver(tree => tree)
;

export const { methods, useState, views } = twoInputs.getViewInterface();
