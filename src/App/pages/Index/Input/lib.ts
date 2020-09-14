import { U } from 'ts-toolbelt';
import { BehaviorSubject, Subject, Observable, of, defer, concat } from 'rxjs';
import * as o from 'rxjs/operators';
import * as React from 'react';

type Use<State, T> = (state: State) => T;

type ControllerViewInterface<State, Methods extends Record<string, (args: any) => void>> = {
  methods: Methods;
  useState(): State;
}

type ControllerParentInterface<Name extends string> = {
  name: Name;
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
    handler: EventHandler<FullState, StoredState, Args>): Event<Name, FullState, StoredState, Args>;
}

type EventHandler<FullState, StoredState, Args> = (state: FullState, args: Args) => StoredState | Observable<StoredState>;

type FinalController<Name extends string, State, EventEmitterMap extends Record<string, (args: any) => void>> = {
  getViewInterface(): ControllerViewInterface<State, EventEmitterMap>;
  getParentInterface(): ControllerParentInterface<Name>
}

// type ControllerWithStoredState<StoredState> = {
  // defineName<Name extends string>(): ControllerWithName<Name, StoredState>;
  // defineDependencies<D extends Dependencies> (): ControllerWithDependencies<Name, StoredState, D, StoredState>;
// }

type Dependencies<Data extends Record<string, any>, Events extends Record<string, any>, View> = {
  data: Data;
  events: Events;
  view: View;
}

type DependencyDefinitionInterface<StoredState, Deps extends Dependencies<any, any, any>> = {
  defineDataDependency<Key extends string, Data>
  (): ControllerWithDependencies<StoredState, Deps & Dependencies<Record<Key, Data>, {}, {}>>;
  // TODO payload could be empty
  defineEventDependency<Key extends string, Payload>
  (): ControllerWithDependencies<StoredState, Deps & Dependencies<{}, Record<Key, Payload>, {}>>;
  defineViewDependency<Key extends string, Props = {}>
  (): ControllerWithDependencies<StoredState, Deps & Dependencies<{}, {}, Record<Key, Props>>>;
}

type DerivedStateDefinitionInterface<StoredState, FullState> = {
  defineDerivedState<P extends string, S1, V>(
    property: P, uses: [Use<FullState, S1>], selector: (a1: S1) => V
  ): ControllerWithDerivedState<StoredState, FullState & Record<P, V>>;
 defineDerivedState<P extends string, S1, S2, V>(
    property: P, uses: [Use<FullState, S1>, Use<FullState, S1>], selector: (a1: S1, a2: S2) => V
  ): ControllerWithDerivedState<StoredState, FullState & Record<P, V>>;
}

type EventsDefinitionInterface<Name extends string ,StoredState, FullState> = {
  defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
  ): FinalController<Name, FullState, EventEmitterMapOf<EventList>>;
}

type ControllerWithName = {
  defineStoredState<StoredState>(initialStoredState: StoredState): ControllerWithStoredState<StoredState>;
}

type ControllerWithStoredState<StoredState> =
  DependencyDefinitionInterface<StoredState, Dependencies<{}, {}, {}>>;

type ControllerWithDerivedState<Name extends string, StoredState, FullState> =
  DerivedStateDefinitionInterface<StoredState, FullState> & EventsDefinitionInterface<Name, StoredState, FullState>;

type ControllerWithDependencies<StoredState, Deps extends Dependencies<any, any, any>> =
  DependencyDefinitionInterface<StoredState, Deps> & DerivedStateDefinitionInterface<StoredState, {}>;

// type ControllerWithDependencies<Name, StoredState, D, FullState> = {
//   defineDerivedState<P extends string, S1, V>(
//     property: P, uses: [Use<FullState, S1>], selector: (a1: S1) => V
//   ): ControllerWithDependencies<Name, StoredState, D, FullState & Record<P, V>>;
//   defineDerivedState<P extends string, S1, S2, V>(
//     property: P, uses: [Use<FullState, S1>, Use<FullState, S2>], selector: (a1: S1, a2: S2) => V
//   ): ControllerWithDependencies<Name, StoredState, D, FullState & Record<P, V>>;
//   defineDerivedState<P extends string, S1, S2, S3, V>(
//     property: P, uses: [Use<FullState, S1>, Use<FullState, S2>, Use<FullState, S3>], selector: (a1: S1, a2: S2, a3: S3) => V
//   ): ControllerWithDependencies<Name, StoredState, D, FullState & Record<P, V>>;
  // defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
  //   getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
  // ): FinalController<FullState, EventEmitterMapOf<EventList>>;
// }

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

type S = {
  value: string;
}

// makeViewController<S, 'name'>('name', {value: 'asd'})
//   .defineDependencies<{
//     privet: 1,

//   }>();

export function makeViewController<Name extends string>(name: Name) {
  return makeControllerWithName();

  function makeControllerWithName(): ControllerWithName {
    return {
      defineStoredState: <StoredState>(initialStoredState: StoredState): ControllerWithStoredState<StoredState> => {
        return makeControllerWithStoredState(initialStoredState)
      }
    }
  }

  function getDependenciesDefinitionInterface<StoredState, Deps extends Dependencies<any, any, any>>
    (initialStoredState: StoredState): DependencyDefinitionInterface<StoredState, Deps> {
      return {
        defineDataDependency<Key extends string, Data>
          (): ControllerWithDependencies<StoredState, Deps & Dependencies<Record<Key, Data>, {}, {}>> {
            return makeControllerWithDepedencies(initialStoredState);
        },
        defineEventDependency<Key extends string, Payload>
          (): ControllerWithDependencies<StoredState, Deps & Dependencies<{}, Record<Key, Payload>, {}>> {
            return makeControllerWithDepedencies(initialStoredState);
          },
        defineViewDependency<Key extends string, Props = {}>
          (): ControllerWithDependencies<StoredState, Deps & Dependencies<{}, {}, Record<Key, Props>>> {
            return makeControllerWithDepedencies(initialStoredState);
          },
        }
      };


  function getDerivedStateDefinitionInterface<StoredState, FullState>
    (initialStoredState: StoredState, derivedStateDescription: DerivedStateDescription[]): DerivedStateDefinitionInterface<StoredState, FullState> {
      return {
        defineDerivedState<P extends string, V>(
          property: P, uses: Array<Use<FullState, any>>, selector: (...args: any[]) => V
        ): ControllerWithDerivedState<StoredState, FullState & Record<P, V>> {
          return makeContollerWithDerivedState(initialStoredState, [...derivedStateDescription, { property, uses, selector }])
        }
      }
    }

  function getEventsDefinitionInterface<StoredState, FullState>
    (initialStoredState: StoredState, derivedStateDescription: DerivedStateDescription[]): EventsDefinitionInterface<StoredState, FullState> {
      return {
        defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
          getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
        ): FinalController<Name, FullState, EventEmitterMapOf<EventList>> {
          return makeFinalController(initialStoredState, derivedStateDescription, getEvents)
        }
      };
    }

  function makeControllerWithStoredState<StoredState>(initialStoredState: StoredState): ControllerWithStoredState<StoredState> {
    return getDependenciesDefinitionInterface(initialStoredState);
  }

  function makeContollerWithDerivedState<StoredState, FullState>(
    initialStoredState: StoredState,
    derivedStateDescription: DerivedStateDescription[],
  ): ControllerWithDerivedState<StoredState, FullState> {

    return {
      ...getDerivedStateDefinitionInterface(initialStoredState, derivedStateDescription),
      ...getEventsDefinitionInterface(initialStoredState, derivedStateDescription)
    };
  }

  function makeControllerWithDepedencies<StoredState, Deps extends Dependencies<any, any, any>>(
    initialStoredState: StoredState,
  ): ControllerWithDependencies<StoredState, Deps> {

    return {
      ...getDependenciesDefinitionInterface(initialStoredState),
      ...getDerivedStateDefinitionInterface(initialStoredState, []),
    }
  }


  function makeFinalController<
    StoredState,
  FullState,
  EventEmitters extends Record<string, (args: any) => void>,
  EventList extends Array<Event<string, FullState, StoredState, any>>
    >(
    initialStoredState: StoredState,
    derivedStateAcc: DerivedStateDescription[],
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList,
  ): FinalController<Name, FullState, EventEmitters> {

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
    let initialFullState: null | FullState = null;

    const getInitialFullState = (): FullState => {
      if (initialFullState === null) {
        initialFullState = transformers.reduce<FullState>((acc, f) => f(acc), initialStoredState as any)
      }
      return initialFullState;
    };

    const fullStateStream = concat(
      defer(() => of(getInitialFullState())),
      storedStateStream.pipe(
        o.skip(1),
        o.map(state => {
          return transformers.reduce<FullState>((acc, f) => f(acc), state as any);
        }),
      ));

    const fullStateForHookStream = fullStateStream.pipe(o.skip(1)); // skip initial state to put it to useState hook

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


    const makeEvent = <Name extends string, Args>(name: Name, handler: EventHandler<FullState, StoredState, Args>): Event<Name, FullState, StoredState, Args> => {
      return {
        name,
        handler,
        emit: (args: Args) =>  rawEventNotificationStream.next({ name, payload: args }),
      };
    }

    const events = getEvents({ makeEvent });
    const eventHanlders = events.reduce<Record<string, EventHandler<FullState, StoredState, any>>>((acc, x) => ({
      ...acc,
      [x.name]: x.handler,
    }), {})

    const eventEmitters = events.reduce<EventEmitters>((acc, x) => ({ ...acc, [x.name]: x.emit }), {} as EventEmitters);

    return {
      getViewInterface: () => {
        return {
          useState: () => {
            const [state, setState] = React.useState<FullState>(getInitialFullState())
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

  // function makeControllerWithDependencies<D extends Dependencies, FullState>(
  //   derivedStateAcc: any[],
  // ): ControllerWithDependencies<Name, StoredState, D, FullState> {
  //   // console.log(dependencies);

  //   const defineDerivedState: ControllerWithDependencies<Name, StoredState, D, FullState>['defineDerivedState'] =
  //     <P extends string, V>(
  //       property: P, uses: any, selector: (...args: any[]) => V
  //     ): ControllerWithDependencies<Name, StoredState, D, FullState & Record<P, V>> => {
  //       return makeControllerWithDependencies(derivedStateAcc.concat({ property, uses, selector }));
  //     }

  //   const defineEvents: ControllerWithDependencies<Name, StoredState, D, FullState>['defineEvents'] =
  //     <EventList extends Array<Event<string, FullState, StoredState, any>>>(
  //       getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
  //     ): FinalController<FullState, EventEmitterMapOf<EventList>> => {

  //       return makeFinalController(derivedStateAcc, getEvents)
  //     }

  //   return {
  //     defineDerivedState,
  //     defineEvents,
  //   };
  // }


}
