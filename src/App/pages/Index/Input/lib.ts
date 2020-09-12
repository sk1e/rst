import { U } from 'ts-toolbelt';
import { BehaviorSubject, Subject, Observable, of, defer, concat } from 'rxjs';
import * as o from 'rxjs/operators';
import * as React from 'react';

type Use<State, T> = (state: State) => T;

type ControllerViewInterface<State, Methods extends Record<string, (args: any) => void>> = {
  methods: Methods;
  useState(): State;
}

type Event<Name extends string, FullState, StoredState, Args> = {
  name: Name;
  handler: EventHandler<FullState, StoredState, Args>;
  emit(args: Args): void;
}

type EventNotification<T> = {
  name: string;
  payload: T;
}

type GetEventsArguments<FullState, StoredState> = {
  makeEvent<Name extends string, Args>(
    name: Name,
    stateMapper: EventHandler<FullState, StoredState, Args>): Event<Name, FullState, StoredState, Args>;
}

type EventHandler<FullState, StoredState, Args> = (state: FullState, args: Args) => StoredState | Observable<StoredState>;

type FinalController<State, EventEmitterMap extends Record<string, (args: any) => void>> = {
  getViewInterface(): ControllerViewInterface<State, EventEmitterMap>;
}

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

// type S = {
//   value: string;
//   n: number;
// }

type _EventMapOf<T, Acc = {}> =
  T extends []
  ? Acc
  : T extends [Event<infer Name, any, any, infer Args>, ...infer XS]
  ? _EventMapOf<XS, Acc & Record<Name, (args: Args) => void>>
  : never;

type EventEmitterMapOf<List> = List extends Array<infer T>
  ? U.ListOf<T> extends Array<Event<string, any, any, any>> ? _EventMapOf<U.ListOf<T>> : never
  : never


// const c: Controller<S, S, {}> = null as any;

// c.defineEvents(({ makeEvent }) => {

//   const setValue = makeEvent(
//     'setValue',
//     (state, { newValue }: { newValue: string }) => {
//       return { ...state, value: newValue };
//     }
//   );

//   const setNumber = makeEvent(
//     'setNumber',
//     (state, { newNumber }: { newNumber: number }): typeof state => {
//       return { ...state, n: newNumber };
//     }
//   );

//   return [setValue, setNumber];
// })
// .getViewInterface()

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
    let initialFullState: null | State = null;

    const getInitialFullState = (): State => {
      if (initialFullState === null) {
        initialFullState = transformers.reduce<State>((acc, f) => f(acc), initialStoredState as any)
      }
      return initialFullState;
    };

    const fullStateStream = concat(
      defer(() => of(getInitialFullState())),
      storedStateStream.pipe(
        o.skip(1),
        o.map(state => {
          return transformers.reduce<State>((acc, f) => f(acc), state as any);
        }),
      ));

    fullStateStream.subscribe(x => console.log('>> fullstate', x));

    const fullStateForHookStream = fullStateStream.pipe(o.skip(1)); // skip initial state to put it to useState hook
    fullStateForHookStream.subscribe(x => console.log('>>0 fullstate for hook', x));

    const rawEventNotificationStream = new Subject<EventNotification<any>>();

    const eventNotificationWithFullStateStream = rawEventNotificationStream.pipe(o.withLatestFrom(fullStateStream));

    eventNotificationWithFullStateStream.subscribe(([notification, state]) => {
      const nextState = eventHanlders[notification.name](state, notification.payload);
      if (nextState instanceof Observable) {
        nextState.subscribe(storedStateStream)
      } else {
        storedStateStream.next(nextState)
      }
    })


    const makeEvent = <Name extends string, Args>(name: Name, handler: EventHandler<State, StoredState, Args>): Event<Name, State, StoredState, Args> => {
      return {
        name,
        handler,
        emit: (args: Args) =>  rawEventNotificationStream.next({ name, payload: args }),
      };
    }

    const events = getEvents({ makeEvent });
    const eventHanlders = events.reduce<Record<string, EventHandler<State, StoredState, any>>>((acc, x) => ({
      ...acc,
      [x.name]: x.handler,
    }), {})

    const eventEmitters = events.reduce<EventEmitters>((acc, x) => ({ ...acc, [x.name]: x.emit }), {} as EventEmitters);

    return {
      getViewInterface: () => {
        return {
          useState: () => {
            const [state, setState] = React.useState<State>(getInitialFullState())
            React.useEffect(() => {
              fullStateForHookStream.subscribe(newState => setState(newState));
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
      <P extends string, V>(property: P, uses: any, selector: (...args: any[]) => V): Controller<StoredState, FullState & Record<P, V>, Methods> => {
        return makeController(derivedStateAcc.concat({ property, uses, selector }))
      }

    const defineEvents: Controller<StoredState, FullState, Methods>['defineEvents'] =
      <EventList extends Array<Event<string, FullState, StoredState, any>>>(
        getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
      ): FinalController<FullState, EventEmitterMapOf<EventList>> => {

        return makeFinalController(derivedStateAcc, getEvents)
      }

    return {
      defineDerivedState,
      defineEvents,
    };
  }

  return makeController<StoredState, {}>([]);
}
