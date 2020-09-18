import { U } from 'ts-toolbelt';
import { BehaviorSubject, Subject, Observable, combineLatest } from 'rxjs';
import * as o from 'rxjs/operators';
import * as React from 'react';

type Use<State, T> = (state: State) => T;

type ControllerViewInterface<State, Methods extends Record<string, (args: any) => void>> = {
  methods: Methods;
  useState(): State;
}

type ControllerParentInterface<Name extends string, ChildrenDeps, Deps extends Dependencies<any, any, any>> = {
  name: Name;
  initializeDependencies(dependencies: ChildrenDeps & Deps): void;
}


type Event<Name extends string, FullState, StoredState, Args> = {
  name: Name;
  handler: EventHandler<FullState, StoredState, Args>;
  emit(args: Args): void;
}

type EventNotification<T> = {
  eventName: string;
  payload: T;
}

type GetEventsArguments<FullState, StoredState> = {
  makeEvent<Name extends string, Args>(
    name: Name,
    handler: EventHandler<FullState, StoredState, Args>): Event<Name, FullState, StoredState, Args>;
}

type EventHandler<FullState, StoredState, Args> = (state: FullState, args: Args) => StoredState | Observable<StoredState>;

type FinalController<
  Name extends string,
  FullState,
  ChildrenDeps,
  Deps extends Dependencies<any, any, any>,
  EventEmitterMap extends Record<string, (args: any) => void>
  > = {
    getViewInterface(): ControllerViewInterface<FullState, EventEmitterMap>;
    getParentInterface(): ControllerParentInterface<Name, ChildrenDeps, Deps>;
  }

type Dependencies<State extends Record<string, any>, Events extends Record<string, any>, View> = {
  state: State;
  events: Events;
  view: View;
}

// === Definition interface types ===

type ChildrenDefinitionInterface<Name extends string, StoredState> = {
  defineChildren<Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>>(
    chlidren: Children
  ): ControllerWithChildren<Name, StoredState, Dependencies<{}, {}, {}> & GetChildrenDependencies<Children>>;
}

type DependencyDefinitionInterface<Name extends string, StoredState, FullState, ChildrenDeps, Deps extends Dependencies<any, any, any>> = {
  defineStateDependency<Key extends string, T>
    (): ControllerWithDependencies<Name, StoredState, FullState & Record<Key, T>, ChildrenDeps, Deps & Dependencies<Record<Key, T>, {}, {}>>;
  // TODO payload could be empty
  defineEventDependency<Key extends string, Payload>
    (): ControllerWithDependencies<Name, StoredState, FullState, ChildrenDeps, Deps & Dependencies<{}, Record<Key, Payload>, {}>>;
  defineViewDependency<Key extends string, Props = {}>
    (): ControllerWithDependencies<Name, StoredState, FullState, ChildrenDeps, Deps & Dependencies<{}, {}, Record<Key, Props>>>;
}

type DerivedStateDefinitionInterface<Name extends string, StoredState, FullState, ChildrenDeps, Deps extends Dependencies<any, any, any>> = {
  defineDerivedState<P extends string, S1, V>(
    property: P, uses: [Use<FullState, S1>], selector: (a1: S1) => V
  ): ControllerWithDerivedState<Name, StoredState, FullState & Record<P, V>, ChildrenDeps, Deps>;
  defineDerivedState<P extends string, S1, S2, V>(
    property: P, uses: [Use<FullState, S1>, Use<FullState, S1>], selector: (a1: S1, a2: S2) => V
  ): ControllerWithDerivedState<Name, StoredState, FullState & Record<P, V>, ChildrenDeps, Deps>;
}

type EventsDefinitionInterface<Name extends string, StoredState, FullState, ChildrenDeps, Deps extends Dependencies<any, any, any>> = {
  defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
  ): FinalController<Name, FullState, ChildrenDeps, Deps, EventEmitterMapOf<EventList>>;
}

//  === Partial controller types ===

type ControllerWithName<Name extends string> = {
  defineStoredState<StoredState>(initialStoredState: StoredState): ControllerWithStoredState<Name, StoredState>;
}

type ControllerWithStoredState<Name extends string, StoredState> =
  DependencyDefinitionInterface<Name, StoredState, StoredState, {}, Dependencies<{}, {}, {}>> &
  DerivedStateDefinitionInterface<Name, StoredState, StoredState, {}, Dependencies<{}, {}, {}>> &
  EventsDefinitionInterface<Name, StoredState, StoredState, {}, Dependencies<{}, {}, {}>> &
  ChildrenDefinitionInterface<Name, StoredState>
;

type ControllerWithChildren<Name extends string, StoredState, ChildrenDeps> =
  DependencyDefinitionInterface<Name, StoredState, StoredState, ChildrenDeps, Dependencies<{}, {}, {}>> &
  DerivedStateDefinitionInterface<Name, StoredState, StoredState, ChildrenDeps, Dependencies<{}, {}, {}>>

type ControllerWithDerivedState<Name extends string, StoredState, FullState, ChildrenDeps, Deps extends Dependencies<any, any, any>> =
  DerivedStateDefinitionInterface<Name, StoredState, FullState, ChildrenDeps, Deps> &
  EventsDefinitionInterface<Name, StoredState, FullState, ChildrenDeps, Deps>;

type ControllerWithDependencies<Name extends string, StoredState, FullState, ChildrenDeps, Deps extends Dependencies<any, any, any>> =
  DependencyDefinitionInterface<Name, StoredState, FullState, ChildrenDeps, Deps> &
  DerivedStateDefinitionInterface<Name, StoredState, FullState, ChildrenDeps, Deps> &
  EventsDefinitionInterface<Name, StoredState, StoredState, ChildrenDeps, Deps>
  ;

type GetChildrenDependencies<Children, Acc = {}> =
  Children extends []
    ? Acc
    : Children extends [ControllerParentInterface<infer Name, infer ChildrenDeps, infer OwnDeps>, ...infer XS]
      ? GetChildrenDependencies<XS, Acc & Record<Name, ChildrenDeps & OwnDeps>>
      : never;

type _EventMapOf<T, Acc = {}> =
  T extends []
  ? Acc
  : T extends [Event<infer Name, any, any, infer Args>, ...infer XS]
  ? _EventMapOf<XS, Acc & Record<Name, (args: Args) => void>>
  : never;

type EventEmitterMapOf<List> = List extends Array<infer T>
  ? U.ListOf<T> extends Array<Event<string, any, any, any>> ? _EventMapOf<U.ListOf<T>> : never
  : never

type DerivedStateDescription = {
  property: string;
  uses: Array<Use<any, any>>;
  selector(...args: any[]): any;
}

// type S = {
//   value: string;
// }

// makeViewController('test')
//   .defineStoredState<S>({ value: '' })
//   .defineStateDependency<'hello', number>()
//   ;

// === Implementation ===

export function makeViewController<Name extends string>(name: Name) {
  return makeControllerWithName();

  function makeControllerWithName(): ControllerWithName<Name> {
    return {
      defineStoredState: <StoredState>(initialStoredState: StoredState): ControllerWithStoredState<Name, StoredState> => {
        return makeControllerWithStoredState(initialStoredState)
      }
    }
  }

  function getDependenciesDefinitionInterface<
    StoredState,
  Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>,
  FullState,
  ChildrenDeps,
  Deps extends Dependencies<any, any, any>
    >(
    initialStoredState: StoredState,
    children: Children,
  ): DependencyDefinitionInterface<Name, StoredState, FullState, ChildrenDeps, Deps> {
    return {
      defineStateDependency<Key extends string, T>
        (): ControllerWithDependencies<Name, StoredState, FullState & Record<Key, T>, ChildrenDeps, Deps & Dependencies<Record<Key, T>, {}, {}>> {
        return makeControllerWithDepedencies(initialStoredState, children);
      },
      defineEventDependency<Key extends string, Payload>
        (): ControllerWithDependencies<Name, StoredState, FullState, ChildrenDeps, Deps & Dependencies<{}, Record<Key, Payload>, {}>> {
        return makeControllerWithDepedencies(initialStoredState, children);
      },
      defineViewDependency<Key extends string, Props = {}>
        (): ControllerWithDependencies<Name, StoredState, FullState, ChildrenDeps, Deps & Dependencies<{}, {}, Record<Key, Props>>> {
        return makeControllerWithDepedencies(initialStoredState, children);
      },
    }
  };


  function getDerivedStateDefinitionInterface<
    StoredState,
  Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>,
  FullState,
  ChildrenDeps,
  Deps extends Dependencies<any, any, any>>(
    initialStoredState: StoredState,
    children: Children,
    derivedStateDescription: DerivedStateDescription[],
  ): DerivedStateDefinitionInterface<Name, StoredState, FullState, ChildrenDeps, Deps> {
    return {
      defineDerivedState<P extends string, V>(
        property: P, uses: Array<Use<FullState, any>>, selector: (...args: any[]) => V
      ): ControllerWithDerivedState<Name, StoredState, FullState & Record<P, V>, ChildrenDeps, Deps> {
        return makeContollerWithDerivedState(
          initialStoredState,
          children,
          [...derivedStateDescription, { property, uses, selector }]
        );
      }
    }
  }

  function getEventsDefinitionInterface<
    StoredState,
  Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>,
  FullState,
  ChildrenDeps,
  Deps extends Dependencies<any, any, any>>(
    initialStoredState: StoredState,
    children: Children,
    derivedStateDescription: DerivedStateDescription[]
  ): EventsDefinitionInterface<Name, StoredState, FullState, ChildrenDeps, Deps> {
    return {
      defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
        getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
      ): FinalController<Name, FullState, ChildrenDeps, Deps, EventEmitterMapOf<EventList>> {
        return makeFinalController(initialStoredState, children, derivedStateDescription, getEvents);
      }
    };
  };


  function getChildrenDefinitionInterface<StoredState>(
    initialStoredState: StoredState
  ): ChildrenDefinitionInterface<Name, StoredState> {
    return {
      defineChildren<Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>>(
        children: Children,
      ): ControllerWithChildren<Name, StoredState, Dependencies<{}, {}, {}> & GetChildrenDependencies<Children>> {
        return makeControllerWithChildren(initialStoredState, children);
      }
    }
  };

  function makeControllerWithChildren<
    StoredState,
  Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>,
  Deps extends Dependencies<any, any, any>
    >(
    initialStoredState: StoredState,
    children: Children,
  ): ControllerWithChildren<Name, StoredState, Deps> {
    return {
      ...getDerivedStateDefinitionInterface(initialStoredState, children, []),
      ...getDependenciesDefinitionInterface(initialStoredState, children),
    }
  }

  function makeControllerWithStoredState<StoredState>(initialStoredState: StoredState): ControllerWithStoredState<Name, StoredState> {
    return {
      ...getDependenciesDefinitionInterface(initialStoredState, []),
      ...getEventsDefinitionInterface(initialStoredState, [], []),
      ...getDerivedStateDefinitionInterface(initialStoredState, [], []),
      ...getChildrenDefinitionInterface(initialStoredState),
    };
  }

  function makeContollerWithDerivedState<
    StoredState,
  FullState,
  ChildrenDeps,
  Deps extends Dependencies<any, any, any>,
  Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>
    >(
    initialStoredState: StoredState,
    children: Children,
    derivedStateDescription: DerivedStateDescription[],
  ): ControllerWithDerivedState<Name, StoredState, FullState, ChildrenDeps, Deps> {

    return {
      ...getDerivedStateDefinitionInterface(initialStoredState, children, derivedStateDescription),
      ...getEventsDefinitionInterface(initialStoredState, children, derivedStateDescription)
    };
  }

  function makeControllerWithDepedencies<
    StoredState,
  Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>,
  FullState,
  ChildrenDeps,
  Deps extends Dependencies<any, any, any>>(
    initialStoredState: StoredState,
      children: Children,
  ): ControllerWithDependencies<Name, StoredState, FullState, ChildrenDeps, Deps> {

    return {
      ...getDependenciesDefinitionInterface(initialStoredState, children),
      ...getDerivedStateDefinitionInterface(initialStoredState, children, []),
      ...getEventsDefinitionInterface(initialStoredState, children, []),
    }
  }


  function makeFinalController<
    StoredState,
     Children extends Array<ControllerParentInterface<string, any, Dependencies<any, any, any>>>,
    FullState,
    ChildrenDeps,
    Deps extends Dependencies<any, any, any>,
    EventEmitters extends Record<string, (args: any) => void>,
    EventList extends Array<Event<string, FullState, StoredState, any>>
  >(
    initialStoredState: StoredState,
    children: Children,
    derivedStateAcc: DerivedStateDescription[],
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList,
  ): FinalController<Name, FullState, ChildrenDeps, Deps, EventEmitters> {

    console.log('>> children', children);

    let dependencies: Deps = {
      events: {},
      state: {},
      view: {},
    } as any;

    const stateDependencies = Object.entries(dependencies.state);

    const storedStateStream = new BehaviorSubject(initialStoredState);

    const storedAndDependencyStateStream =
      combineLatest([storedStateStream, ...stateDependencies.map(([_, observable]) => observable)])
        .pipe(
          o.map(([storedState, ...dependencyState]: any[]) => ({
            ...storedState,
            ...dependencyState.reduce((acc, x, index) => ({
              ...acc,
              [stateDependencies[index][0]]: x,
            }), {}),
          }))
        )

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


    const fullStateStream = storedAndDependencyStateStream.pipe(
      o.map(state => {
        return transformers.reduce<FullState>((acc, f) => f(acc), state as any);
      }));

    const fullStateForHookStream = fullStateStream.pipe(o.skip(1));
    const initialFullStateStream = fullStateStream.pipe(o.take(1));

    let initialFullState: null | FullState = null;

    const getInitialFullState = (): FullState => {
      console.log('>> pre subscrbe');
      initialFullStateStream.subscribe(state => {
        console.log('>> in subscrbe');
        initialFullState = state;
      });

      console.log('>> post subscrbe');

      if (initialFullState === null) {
        console.error('>> initial full state is not initialized');
      }

      return initialFullState as FullState;
    };

    // const fullStateStream = concat(
    //   defer(() => of(getInitialFullState())),
    //   storedStateStream.pipe(
    //     o.skip(1),
    //     o.map(state => {
    //       return transformers.reduce<FullState>((acc, f) => f(acc), state as any);
    //     }),
    //   ));

    const rawEventNotificationStream = new Subject<EventNotification<any>>();

    const makeEvent = <Name extends string, Args>(name: Name, handler: EventHandler<FullState, StoredState, Args>): Event<Name, FullState, StoredState, Args> => {
      return {
        name,
        handler,
        emit: (args: Args) => rawEventNotificationStream.next({ eventName: name, payload: args }),
      };
    }

    const events = getEvents({ makeEvent });
    const eventHandlers = events.reduce<Record<string, EventHandler<FullState, StoredState, any>>>((acc, x) => ({
      ...acc,
      [x.name]: x.handler,
    }), {})

    const eventEmitters = events.reduce<EventEmitters>((acc, x) => ({ ...acc, [x.name]: x.emit }), {} as EventEmitters);

    const eventNotificationWithFullStateStream = rawEventNotificationStream.pipe(o.withLatestFrom(fullStateStream));

    eventNotificationWithFullStateStream.subscribe(([notification, state]) => {
      const nextState = eventHandlers[notification.eventName](state, notification.payload);
      if (nextState instanceof Observable) {
        nextState.subscribe(storedStateStream)
      } else {
        storedStateStream.next(nextState)
      }
    });

    return {
      getViewInterface() {
        return {
          useState: () => {
            const [state, setState] = React.useState<FullState>(getInitialFullState)
            React.useEffect(() => {
              fullStateForHookStream.subscribe(newState => setState(newState));
            });
            return state;
          },
          methods: eventEmitters,
        };
      },
      getParentInterface() {
        return {
          name,
          initializeDependencies: deps => {
            dependencies = {
              events: {...dependencies.events, ...deps.events},
              state: {...dependencies.state, ...deps.state},
              view: {...dependencies.view, ...deps.view},
            } as any;
          },
        }
      }
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
