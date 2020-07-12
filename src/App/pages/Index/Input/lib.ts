import * as R from 'ramda';
import { BehaviorSubject } from 'rxjs';
import * as o from 'rxjs/operators';

type Use<State, T> = (state: State) => T;

// type ControllerPublicInterface<Methods extends Record<string, (args: any) => void>> = {
//   methods: Methods;
// }

type Controller<State> = {
  // stream: BehaviorSubject<State>;
  // getPublicInterface(): ControllerPublicInterface<Methods>;
  defineDerivedState<P extends string, S1, V>(
    property: P, uses: [Use<State, S1>], selector: (a1: S1) => V
  ): Controller<State & Record<P, V>>;
  defineDerivedState<P extends string, S1, S2, V>(
    property: P, uses: [Use<State, S1>, Use<State, S2>], selector: (a1: S1, a2: S2) => V
  ): Controller<State & Record<P, V>>;
  defineDerivedState<P extends string, S1, S2, S3, V>(
    property: P, uses: [Use<State, S1>, Use<State, S2>, Use<State, S3>], selector: (a1: S1, a2: S2, a3: S3) => V
  ): Controller<State & Record<P, V>>;
}

type S = {
  value: string;
  n: number;
}

const c: Controller<S> = null as any;

// c.defineDerivedState('len', [(x => x.value), x => x.n], (a, b) => a + b)

// return storedStateStream.pipe(o.map(state => arrangedSelectors.reduce((acc, x) => ({
//   ...acc,
//   [x.selectedProperty]: x.select(acc),
// }), state)));

export function makeStateController<StoredState>(initialState: StoredState) {

  function makeController<State>(stream: BehaviorSubject<State>): Controller<State> {
    return {
      stream,
      defineDerivedState: function <U extends Array<UnknownSelector<State>>, P extends string>
        (property: P, uses: U) {
        console.log(property, uses)
        // return makeController(addDerivedState(stream, description as any));
        return addDerivedState as any || null as any;
      } as any,
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
      [description.property]: (description.select as any)(...derivedStateDependencySelectors.map(f => f(state)) as any),
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
