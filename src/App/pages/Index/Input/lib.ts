import { U, L } from 'ts-toolbelt';
import * as R from 'ramda';
import { BehaviorSubject, Observable } from 'rxjs';
import * as o from 'rxjs/operators';
// import {useState} from 'react'

type Use<State, T> = (state: State) => T;

type ControllerViewInterface<State, Methods extends Record<string, (args: any) => void>> = {
  methods: Methods;
  useState(): State;
}

// type _Reverse<L extends List, LO extends List, I extends Iteration = IterationOf<'0'>> = {
//   0: _Reverse<L, Prepend<LO, L[Pos<I>]>, Next<I>>;
//   1: LO;
// }[Pos<I> extends Length<L> ? 1 : 0];

type Event<Name extends string, State, Args> = {
  name: Name;
  mapper: StateMapper<State, Args>;
}

type GetEventsArguments<State> = {
  makeEvent<Name extends string, Args>(
    name: Name,
    stateMapper: StateMapper<State, Args>): Event<Name, State, Args>,
}

type StateMapper<State, Args> = (state: State, args: Args) => State | Observable<State> | void;

type FinalController<State, EventEmitterMap extends Record<string, (args: any) => void>> = {
  getViewInterface(): ControllerViewInterface<State, EventEmitterMap>;
}

type Controller<State, EventEmitterMap extends Record<string, (args: any) => void>> = {
  defineDerivedState<P extends string, S1, V>(
    property: P, uses: [Use<State, S1>], selector: (a1: S1) => V
  ): Controller<State & Record<P, V>, EventEmitterMap>;
  defineDerivedState<P extends string, S1, S2, V>(
    property: P, uses: [Use<State, S1>, Use<State, S2>], selector: (a1: S1, a2: S2) => V
  ): Controller<State & Record<P, V>, EventEmitterMap>;
  defineDerivedState<P extends string, S1, S2, S3, V>(
    property: P, uses: [Use<State, S1>, Use<State, S2>, Use<State, S3>], selector: (a1: S1, a2: S2, a3: S3) => V
  ): Controller<State & Record<P, V>, EventEmitterMap>;
  defineEvents<EventList extends unknown[]>(
    getEvents: (args: GetEventsArguments<State>) => EventList
  ): FinalController<State, EventEmitterMap & EventEmitterMapOf<EventList>>
  // defineEvents<EventList extends unknown[]>(getEvents:
  //   (makeEvent:
  //     <Name extends string, Args>(
  //       name: Name,
  //       stateMapper: StateMapper<State, Args>) => Event<Name, State, Args>) => EventList
  // ): FinalController<State, EventEmitterMap & EventEmitterMapOf<EventList>>
}

type S = {
  value: string;
  n: number;
}

type _EventMapOf<T extends Array<Event<string, any, any>>, Acc = {}, X extends Event<string, any, any> = L.Head<T>> = {
  0: Acc;
  1: _EventMapOf<L.Tail<T>, Acc & Record<X['name'], (args: Parameters<X['mapper']>[1]) => void>>
}[T['length'] extends 0 ? 0 : 1]

type EventEmitterMapOf<List> = List extends Array<infer T>
  ? U.ListOf<T> extends Array<Event<string, any, any>> ? _EventMapOf<U.ListOf<T>> : never
  : never

const c: Controller<S, {}> = null as any;

c.defineEvents(({makeEvent}) => {
  const setValue = makeEvent(
    'setValue',
    (state, { newValue }: { newValue: string }) => {
      return { ...state, value: newValue };
    }
  );

  const setNumber = makeEvent(
    'setNumber',
    (state, { newNumber }: { newNumber: number }): typeof state => {
      return { ...state, n: newNumber };
    }
  );

  return [setValue, setNumber];
})

// c.defineDerivedState('len', [(x => x.value), x => x.n], (a, b) => a + b)

// return storedStateStream.pipe(o.map(state => arrangedSelectors.reduce((acc, x) => ({
//   ...acc,
//   [x.selectedProperty]: x.select(acc),
// }), state)));
//


type EventLocalInterface = {
  emit(): void;
}

export function makeStateController<StoredState>(initialState: StoredState) {

  function makeController<State, Methods extends Record<string, (args: any) => void>>(
    derivedStateAcc: any[],
  ): Controller<State, Methods> {

    const defineDerivedState: Controller<State, Methods>['defineDerivedState'] =
      <P extends string, V>(property: P, uses: any, selector: (...args: any[]) => V): Controller<State & Record<P, V>, Methods> => {
        return makeController(derivedStateAcc.concat({property, uses, selector}))
      }l

    const defineEvents: Controller<State, Methods>['defineEvents'] =
      <EventList>(getEvents: (args: GetEventsArguments<State>) => EventList): Controller<State, EventEmitterMapOf<EventList>>  => {
        const makeEvent = (_name: any, _handler: any): EventLocalInterface => {
          return {
            emit: () => {},
          };
        }

        const events = getEvents({makeEvent});
      }
    return {
        defineDerivedState,
      };
      // defineDerivedState: function <U extends Array<UnknownSelector<State>>, P extends string>
      //   (property: P, uses: U) {
      //   console.log(property, uses)
      //   // return makeController(addDerivedState(stream, description as any));
      //   return addDerivedState as any || null as any;
      // } as any,
    }

  // const storedStateStream = new BehaviorSubject<StoredState>(initialState);

  return makeController([]);
  // return makeController(storedStateStream)
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
