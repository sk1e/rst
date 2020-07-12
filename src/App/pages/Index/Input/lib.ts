import * as R from 'ramda';
import { BehaviorSubject } from 'rxjs';
import * as o from 'rxjs/operators';

type Lens<T> = {
  getFocus(): string[];
  value: T;
}

type LensOf<T> = {
  [P in keyof T]: T[P] extends Record<string, any> ? LensOf<T[P]> : Lens<T[P]>
}

type ArgsOf<T> = T

type UnknownSelector<State> = (state: LensOf<State>) => Lens<unknown>

export type DerivedStateElementDescription<State, P extends string, U extends Array<UnknownSelector<State>>, V> = {
  property: P;
  uses: U;
  select(...args: ArgsOf<U>): V;
}

// type DerivedStateDescription = Record<string, DerivedStateElementDescription>

// type DerivedStateSelector = {
//   selectedProperty: string;
//   select(state: any): any;
// }

export function makeEmptyLens<T>(): Lens<T> {
  function proxyTree(lensAcc: string[]): Lens<T> {
    return new Proxy(
      { getFocus: () => lensAcc } as Lens<T>,
      {
        get: (obj, key) => key === 'getFocus'
          ? obj.getFocus
          : proxyTree(lensAcc.concat(key as string))
      }
    )
  }

  return proxyTree([]);
}

type Controller<State> = {
  stream: BehaviorSubject<State>;
  defineDerivedState<P extends string, U extends Array<UnknownSelector<State>>, V>(
    description: DerivedStateElementDescription<State, P, U, V>): Controller<State & Record<P, V>>
}

// return storedStateStream.pipe(o.map(state => arrangedSelectors.reduce((acc, x) => ({
//   ...acc,
//   [x.selectedProperty]: x.select(acc),
// }), state)));

export function makeStateController<StoredState>(initialState: StoredState) {

  function makeController<State>(stream: BehaviorSubject<State>): Controller<State> {
    return {
      stream,
      defineDerivedState: function <P extends string, U extends Array<UnknownSelector<State>>, V>
        (description: DerivedStateElementDescription<State, P, U, V>) {
        return makeController(addDerivedState(stream, description));
      },
    }
  }

  const storedStateStream = new BehaviorSubject<StoredState>(initialState);

  return makeController(storedStateStream)
}

function addDerivedState<State, P extends string, U extends Array<UnknownSelector<State>>, V>(
  stream: BehaviorSubject<State>, description: DerivedStateElementDescription<State, P, U, V>
): BehaviorSubject<State & Record<P, V>> {
  const derivedStateDependencySelectors = description.uses.map(getLens => {
    const lens = getLens(makeEmptyLens() as any);
    const focus = lens.getFocus();

    return (state: State) => R.view(R.lensPath(focus), state);
  });

  const extendState = (state: State): any => {
    return {
      ...state,
      [description.property]: description.select(...derivedStateDependencySelectors.map(f => f(state)) as any),
    }
  };


  return stream.pipe(o.map(extendState)) as any
}


// export function makeStateController<
//   StoredState,
//   DerivedStateDescription extends Record<string, DerivedStateElementDescription<StoredState, DerivedStateDescription>>>
//   (config: Config<StoredState, DerivedStateDescription>) {
//   const storedStateStream = new BehaviorSubject<StoredState>(config.initialStoredState);

//   return addDerivedStateToStream<StoredState, DerivedStateDescription>(storedStateStream, config.derivedStateDescription)
// }

// function addDerivedStateToStream<
//   StoredState,
//   DerivedStateDescription extends Record<string, DerivedStateElementDescription<StoredState, DerivedStateDescription>>>
//   (storedStateStream: BehaviorSubject<any>, derivedStateDescription: DerivedStateDescription) {

//   const arrangedSelectors = getArrangedSelectors<StoredState, DerivedStateDescription>(storedStateStream, derivedStateDescription);

//   return storedStateStream.pipe(o.map(state => arrangedSelectors.reduce((acc, x) => ({
//     ...acc,
//     [x.selectedProperty]: x.select(acc),
//   }), state)));
// }

// function getArrangedSelectors<
//   StoredState,
//   DerivedStateDescription extends Record<string, DerivedStateElementDescription<StoredState, DerivedStateDescription>>>
//   (
//     storedStateStream: BehaviorSubject<any>,
//     derivedStateDescription: DerivedStateDescription
//   ): DerivedStateSelector[] {
//   function loop(
//     arrangedSelectorAcc: DerivedStateSelector[],
//     arrangedDerivedStatePropAcc: string[],
//     entriesToArrange: Array<[string, DerivedStateElementDescription<StoredState, DerivedStateDescription>]>
//   ): DerivedStateSelector[] {
//     if (entriesToArrange.length === 0) {
//       return arrangedSelectorAcc;
//     }

//     const [nextArrangedEntriesChunk, nextEntriesToArrange] = R.partition(x => x[1].uses.every(getLens => {
//       const lens = getLens(makeEmptyLens() as any);
//       const focusHead = lens.getFocus()[0];

//       return arrangedDerivedStatePropAcc.includes(focusHead) || focusHead in storedStateStream.getValue();

//     }), entriesToArrange)

//     const nextArrangedDerivedStatePropAcc = arrangedDerivedStatePropAcc
//       .concat(nextArrangedEntriesChunk.map(x => x[0]));

//     const nextArrangedSelectorAcc = arrangedSelectorAcc
//       .concat(nextArrangedEntriesChunk.map<DerivedStateSelector>(x => {
//         const [derivedStateProperty, derivedStateElement] = x;
//         const selectorsOfDependencies = derivedStateElement.uses
//           .map(getLens => (state: any) => {
//             const focus = getLens(makeEmptyLens() as any).getFocus();
//             return R.view(R.lensPath(focus), state);
//           })

//         return {
//           selectedProperty: derivedStateProperty,
//           select: state => derivedStateElement.select(...selectorsOfDependencies.map(f => f(state))),
//         };
//       }));


//     return loop(nextArrangedSelectorAcc, nextArrangedDerivedStatePropAcc, nextEntriesToArrange);
//   }

//   return loop([], [], Object.entries(derivedStateDescription));
// }
