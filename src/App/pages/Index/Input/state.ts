import { makeViewController } from './lib';

type S = {
  value: string;
};

const contr1 = makeViewController('Input')
  .defineStoredState<S>({value: 'privet' })
  // .defineStateDependency<'name', string>('name')
  .defineDerivedState(
    'fullValue',
    [
      // state => state.name,
      state => state.value,
    ],
    // (name, value) => `${value} ${name}`
    (value) => `${value} full`
  )
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
  });

// const contr2 = makeViewController('AnotherInput')
//   .defineStoredState<S>({value: 'privet' })
//   .defineStateDependency<'address', string>()
//   .defineEvents(({makeEvent}) => {
//     const setValue = makeEvent(
//       'setValue',
//       (state, {newValue}: {newValue: string}): S =>
//         ({...state, value: newValue})
//     );

//     return [setValue];
//   });


// type P = {
//   numericValue: number;
// }

// const contr1ParentInterface  = contr1.getParentInterface();
// const contr2ParentInterface  = contr2.getParentInterface();


// // type GetDescendantsDependencies<Children, Acc = {}> =
// //   Children extends []
// //   ? Acc
// //   : Children extends [ControllerParentInterface<infer ChildName, any, infer OwnDeps, infer ChildDescendantDeps>, ...infer XS]
// //     ? keyof ChildDescendantDeps extends never
// //       ? GetDescendantsDependencies<XS, Acc>
// //       : keyof ChildDescendantDeps extends string
// //         ? GetDescendantsDependencies<
// //            XS,
// //            Acc &
// //            { [K in keyof ChildDescendantDeps as `${ChildName}.${K}`]: ChildDescendantDeps[K] } &
// //            OwnDeps extends Depedendencies<{}, {}, {}>
// //              ? {}
// //              : Record<ChildName, OwnDeps>
// //         : boolean
// //     : number;


// // type W = GetDescendantsDependencies<[]>
// // type Q = GetDescendantsDependencies<[typeof parentInterface]>

// // type Chd = [typeof contr1]

// // export type GetDeps<Children, Acc = {}> =
// //   Children extends []
// //     ? 1
// //     : Children extends [ControllerParentInterface<infer ChildName, any, infer OwnDeps, infer ChildDescendantDeps>, ...infer XS]
// //       ? keyof ChildDescendantDeps extends never
// //         ? 2
// //         : 3
// //       : 4

// // type T = GetDeps<Chd>

// // export type _GetDescendantsDependencies<Children, Acc = {}> =
// //   Children extends []
// //   ? Acc
// //   : Children extends [ControllerParentInterface<infer ChildName, any, infer OwnDeps, infer ChildDescendantDeps>, ...infer XS]
// //     ? keyof ChildDescendantDeps extends never
// //       ? _GetDescendantsDependencies<XS, Acc>
// //       : keyof ChildDescendantDeps extends string
// //         ? _GetDescendantsDependencies<
// //            XS,
// //            Acc &
// //            { [K in keyof ChildDescendantDeps as `${ChildName}.${K}`]: ChildDescendantDeps[K] } &
// //            DependenciesAreEmpty<OwnDeps> extends 1
// //              ? {}
// //              : Record<ChildName, OwnDeps>
// //            >
// //         : boolean
// //     : number;


// type DependenciesAreEmpty<Deps extends Dependencies<any, any, any>> =
//   keyof Deps['events'] | keyof Deps['state'] | keyof Deps['view'] extends never ? 1 : 0

// type E = typeof contr1 extends ControllerParentInterface<any, any, infer OwnDeps, any>
//     ? DependenciesAreEmpty<OwnDeps> extends 1
//       ? 1
//       : OwnDeps
//     : 3

// // const pp = makeViewController('Parent')
// //   .defineStoredState<P>({numericValue: 2})
// //   .defineChildren([parentInterface])

// const parent = makeViewController('Parent')
//   .defineStoredState<P>({numericValue: 2})
//   .defineChildren([contr1ParentInterface, contr2ParentInterface])
//   .defineEvents(() => [])
//   // .defineStateDependenciesResolver
//   .defineEventDependenciesResolver()
//   .defineStateDependenciesResolver(() => ({
//     AnotherInput: {address: 1}
//   }))
//   .defineViewDependenciesResolver()
// ;

// // type R = Exclude<1 | 2 | 3, 1>

// const parentParentInterface = parent.getParentInterface();

// type F = typeof parentParentInterface extends ControllerParentInterface<any, any, any, any, any, infer T> ? T : never

// type Chd = [typeof parentParentInterface]

// type A = GetStateDescendantsDependencies<Chd>

// const grandParent = makeViewController('GrandParent')
//   .defineStoredState<P>({numericValue: 2})
//   .defineChildren([parentParentInterface])
//   .defineStateDependenciesResolver(() => ({
//     // 'Parent.Input': {name: 'asd'},
//   }))

export const { methods, useState } = contr1.getViewInterface();
