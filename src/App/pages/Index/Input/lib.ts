import { U } from 'ts-toolbelt';
// import * as R from 'ramda';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import * as o from 'rxjs/operators';
import * as React from 'react';

type Use<State, T> = (state: State) => T;

type ControllerViewInterface<State, Methods extends Record<string, (args: any) => void>> = {
  methods: Methods;
  useState(): State;
}

// type _Reverse<L extends List, LO extends List, I extends Iteration = IterationOf<'0'>> = {
//   0: _Reverse<L, Prepend<LO, L[Pos<I>]>, Next<I>>;
//   1: LO;
// }[Pos<I> extends Length<L> ? 1 : 0];

type Event<Name extends string, FullState, StoredState, Args> = {
  name: Name;
  mapper: StateMapper<FullState, StoredState, Args>;
  emit(args: Args): void;
}

// type EventMini<Name extends String, Args> = {
//   name: Name;
//   mapper: (state: any, args: Args) => any;
// }

type EventNotification<T, FullState, StoredState> = {
  name: string;
  payload: T;
  event: Event<string, FullState, StoredState, T>;
}

type GetEventsArguments<FullState, StoredState> = {
  makeEvent<Name extends string, Args>(
    name: Name,
    stateMapper: StateMapper<FullState, StoredState, Args>): Event<Name, FullState, StoredState, Args>;
}

type StateMapper<FullState, StoredState, Args> = (state: FullState, args: Args) => StoredState | Observable<StoredState>;

type FinalController<State, EventEmitterMap extends Record<string, (args: any) => void>> = {
  getViewInterface(): ControllerViewInterface<State, EventEmitterMap>;
}

// type Awaited<T> =
//     T extends null | undefined ? T :
//     T extends PromiseLike<infer U> ? Awaited<U> :
//     T;

// type P1 = Awaited<Promise<string>>;  // string
// type P2 = Awaited<Promise<Promise<string>>>;  // string
// type P3 = Awaited<Promise<string | Promise<Promise<number> | undefined>>>;  // string | number | undefined

type Controller<StoredState, FullState, EventEmitterMap extends Record<string, (args: any) => void>> = {
  defineDerivedState<P extends string, S1, V>(
    property: P, uses: [Use<FullState, S1>], selector: (a1: S1) => V
  ): Controller<StoredState, FullState & Record<P, V>, EventEmitterMap>;
  defineDerivedState<P extends string, S1, S2, V>(
    property: P, uses: [Use<FullState, S1>, Use<FullState, S2>], selector: (a1: S1, a2: S2) => V
  ): Controller<StoredState, FullState & Record<P, V>, EventEmitterMap>;
  defineDerivedState<P extends string, S1, S2, S3, V>(
    property: P, uses: [Use<FullState, S1>, Use<FullState, S2>, Use<FullState, S3>], selector: (a1: S1, a2: S2, a3: S3) => V
  ): Controller<StoredState, FullState & Record<P, V>, EventEmitterMap>;
  // defineDerivedState<P extends string, S1, S2, S3, S4, V>(
  //   property: P, uses: [
  //     Use<State, S1>,
  //     Use<State, S2>,
  //     Use<State, S3>,
  //     Use<State, S4>
  //   ],
  //   selector: (a1: S1, a2: S2, a3: S3, a4: S4) => V
  // ): Controller<State & Record<P, V>, EventEmitterMap>;
  // defineDerivedState<P extends string, S1, S2, S3, S4, S5, V>(
  //   property: P, uses: [
  //     Use<State, S1>,
  //     Use<State, S2>,
  //     Use<State, S3>,
  //     Use<State, S4>,
  //     Use<State, S5>
  //   ],
  //   selector: (a1: S1, a2: S2, a3: S3, a4: S4, a5: S5) => V
  // ): Controller<State & Record<P, V>, EventEmitterMap>;
  // defineDerivedState<P extends string, S1, S2, S3, S4, S5, S6, V>(
  //   property: P, uses: [
  //     Use<State, S1>,
  //     Use<State, S2>,
  //     Use<State, S3>,
  //     Use<State, S4>,
  //     Use<State, S5>,
  //     Use<State, S6>
  //   ],
  //   selector: (a1: S1, a2: S2, a3: S3, a4: S4, a5: S5) => V
  // ): Controller<State & Record<P, V>, EventEmitterMap>;

  // defineEvents<EventList extends Array<EventMini<string, any>>>( // not State, State
  defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>( // not State, State      //
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList // not State, State
  ): FinalController<FullState, EventEmitterMap & EventEmitterMapOf<EventList>>;
}

type S = {
  value: string;
  n: number;
}

type _EventMapOf<T, Acc = {}> =
  T extends []
    ? Acc
    : T extends [Event<infer Name, any, any, infer Args>, ...infer XS]
      ? _EventMapOf<XS, Acc & Record<Name, (args: Args) => void>>
      : never;

type EventEmitterMapOf<List> = List extends Array<infer T>
  ? U.ListOf<T> extends Array<Event<string, any, any, any>> ? _EventMapOf<U.ListOf<T>> : never
  : never


const c: Controller<S, S, {}> = null as any;

c.defineEvents(({ makeEvent }) => {

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
.getViewInterface()

// c.defineDerivedState('len', [(x => x.value), x => x.n], (a, b) => a + b)

// return storedStateStream.pipe(o.map(state => arrangedSelectors.reduce((acc, x) => ({
//   ...acc,
//   [x.selectedProperty]: x.select(acc),
// }), state)));

type DerivedStateDescription = {
  property: string;
  uses: Array<Use<any, any>>;
  selector(...args: any[]): any;
}

export function makeStateController<StoredState>(initialStoredState: StoredState) {
  function makeFinalController<State, EventEmitters extends Record<string, (args: any) => void>, EventList extends Array<Event<string, State, StoredState, any>>>(
    derivedStateAcc: DerivedStateDescription[],
    getEvents: (args: GetEventsArguments<State, StoredState>) => EventList,
  ): FinalController<State, EventEmitters> {

    const storedStateStream = new BehaviorSubject(initialStoredState);

    const transformers = derivedStateAcc.map(derivedStateDescription => {
      const lastDependencies = derivedStateDescription.uses.map(() => Symbol('initial'));
      return (dependentState: any) => {
        const dependencies = derivedStateDescription.uses.map(f => f(dependentState));
        // derivedStateDescription.uses
        if (dependencies.some((x, index) => lastDependencies[index] !== x)) {
          return {
            ...dependentState,
            [derivedStateDescription.property]: derivedStateDescription.selector(...dependencies),
          };
        }

        return dependentState;
      }
    })
    let initialState: null | State = null;

    const getInitialState = (): State => {
      if (initialState === null) {
        initialState = transformers.reduce<State>((acc, f) => f(acc), initialStoredState as any)
      }
      return initialState;
    };

    const fullStateStream = storedStateStream.pipe(
      o.skip(1), // skip initial state to put it to useState hook
      o.map(state => {
        return transformers.reduce<State>((acc, f) => f(acc), state as any);
      }));

    const rawEventNotificationStream = new Subject<EventNotification<any, State, StoredState>>();

    // const fullStateStream = new Subject<State>();
    // const eventNotificationWithFullStateStream = new Subject<[EventNotification<any, State, StoredState>, State]>()

    const eventNotificationWithFullStateStream = rawEventNotificationStream.pipe(o.withLatestFrom(fullStateStream));

    // const eventNotificationWithFullStateProxyStream = rawEventNotificationStream.pipe(o.withLatestFrom(fullStateStream));
    // eventNotificationWithFullStateProxyStream.subscribe(eventNotificationWithFullStateStream);

    eventNotificationWithFullStateStream.subscribe(([{event: {mapper}, payload}, state]) => {
      const nextState = mapper(state, payload);
      if (nextState instanceof Observable) {
        nextState.subscribe(storedStateStream)
      } else {
        storedStateStream.next(nextState)
      }
    })


    const makeEvent = <Name extends string, Args>(name: Name, mapper: StateMapper<State, StoredState, Args>): Event<Name, State, StoredState, Args> => {
      // const a = {
      //   b: 2,
      //   c: 3,
      //   getSelf() { return this }
      // }
      return {
        name,
        mapper,
        emit(args: Args) {
          rawEventNotificationStream.next({event: this, name, payload: args});
        }
      };
    }

    // const stateStreamSubject = new Subject();
    // stateStreamSubject.subscribe(stateStream);


    // eventNotificationStream.subscribe((event: Event<string, State, any>) => {
    //   const state = stateStream
    // })

    const events = getEvents({ makeEvent });

    const eventEmitters = events.reduce<EventEmitters>((acc, x) => ({ ...acc, [x.name]: x.emit }), {} as EventEmitters);

    return {
      getViewInterface: () => {
        return {
          useState: () => {
            const [state, setState] = React.useState<State>(getInitialState())
            React.useEffect(() => {
              fullStateStream.subscribe(newState => setState(newState))
            });

            return state;
          },
          methods: eventEmitters,
        };
      },
    }
  }

  function makeController<FullState, Methods extends Record<string, (args: any) => void>>(
    derivedStateAcc: any[],
  ): Controller<StoredState, FullState, Methods> {

    const defineDerivedState: Controller<StoredState, FullState, Methods>['defineDerivedState'] =
    // const defineDerivedState =
      <P extends string, V>(property: P, uses: any, selector: (...args: any[]) => V): Controller<StoredState, FullState & Record<P, V>, Methods> => {
        return makeController(derivedStateAcc.concat({ property, uses, selector }))
      }

    const defineEvents: Controller<StoredState, FullState, Methods>['defineEvents'] =
    // const defineEvents =
      <EventList extends Array<Event<string, FullState, StoredState, any>>>(
        getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
      // ): FinalController<FullState, any> => {
      ): FinalController<FullState, EventEmitterMapOf<EventList>> => {

        // const events = getEvents({ makeEvent });

        return makeFinalController(derivedStateAcc, getEvents)
      }

    return {
      defineDerivedState,
      defineEvents,
    };
    // defineDerivedState: function <U extends Array<UnknownSelector<State>>, P extends string>
    //   (property: P, uses: U) {
    //   console.log(property, uses)
    //   // return makeController(addDerivedState(stream, description as any));
    //   return addDerivedState as any || null as any;
    // } as any,
  }

  // const storedStateStream = new BehaviorSubject<StoredState>(initialState);

  return makeController<StoredState, {}>([]);
  // return makeController(storedStateStream)
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
