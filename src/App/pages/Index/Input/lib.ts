import { U } from 'ts-toolbelt';
import { BehaviorSubject, Subject, Observable, combineLatest, of } from 'rxjs';
import * as o from 'rxjs/operators';
import * as React from 'react';

type Use<State, T> = (state: State) => T;

type ControllerViewInterface<State, Methods extends Record<string, (args: any) => void>> = {
  methods: Methods;
  useState(): State;
}

type DependencyResolvers = Partial<{
  state(args: StateDependenciesResolverArguments<StoredState, DerivedState, StateDeps, Children>): any;
  events(args: any): any;
}>

export type ControllerParentInterface<
  Name extends string, StateDeps, EventDeps, StateDescendantsDeps, EventDescendantDeps,
  > = {
    name: Name;
    getDescendantDependencies(): { state: StateDescendantsDeps, events: EventDescendantDeps };
    initializeStateDependencies(deps: Partial<StateDeps>): void;
    initializeEventDependencies(deps: Partial<EventDeps>): void;
  }

export type GetStateDescendantsDependencies<Children, Deps = _GetStateDescendantsDependencies<Children>> =
  { [K in keyof Deps]: Deps[K] };

export type _GetStateDescendantsDependencies<Children, Acc = {}> =
  Children extends []
    ? Acc
    : Children extends [
      ControllerParentInterface<
        infer ChildName,
        infer ChildStateDeps,
        any,
        infer ChildDescendantStateDeps,
        any
        >,
      ...infer XS
    ]
      ? keyof ChildDescendantStateDeps extends never
        ? keyof ChildStateDeps extends never
          ? _GetStateDescendantsDependencies<XS, Acc>
          : _GetStateDescendantsDependencies<XS, Acc & Record<ChildName, ChildStateDeps>>
        : keyof ChildDescendantStateDeps extends string
        ? _GetStateDescendantsDependencies<
            XS,
            Acc &
            { [K in keyof ChildDescendantStateDeps as `${ChildName}.${K}`]: ChildDescendantStateDeps[K] } &
              (keyof ChildStateDeps extends never
                ? {}
                : Record<ChildName, ChildStateDeps>)
            >
        : never
      : never;

export type GetEventDescendantsDependencies<Children, Deps = _GetEventDescendantsDependencies<Children>> =
  { [K in keyof Deps]: Deps[K] };

export type _GetEventDescendantsDependencies<Children, Acc = {}> =
  Children extends []
    ? Acc
    : Children extends [
      ControllerParentInterface<
        infer ChildName,
        any,
        infer ChildEventDeps,
        any,
        infer ChildDescendantEventDeps
        >,
      ...infer XS
    ]
      ? keyof ChildDescendantEventDeps extends never
        ? keyof ChildEventDeps extends never
          ? _GetEventDescendantsDependencies<XS, Acc>
          : _GetEventDescendantsDependencies<XS, Acc & Record<ChildName, ChildEventDeps>>
        : keyof ChildDescendantEventDeps extends string
        ? _GetEventDescendantsDependencies<
            XS,
            Acc &
            { [K in keyof ChildDescendantEventDeps as `${ChildName}.${K}`]: ChildDescendantEventDeps[K] } &
              (keyof ChildEventDeps extends never
                ? {}
                : Record<ChildName, ChildEventDeps>)
            >
        : never
      : never;


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

// === Definition interface types ===

type ChildrenDefinitionInterface<Name extends string, StoredState> = {
  defineChildren<Children extends Array<ControllerParentInterface<string, any, any, any, any>>>(
    chlidren: Children
  ): ControllerWithChildren<Name, StoredState, Children extends Array<infer T> ? U.ListOf<T> : never>;
}

type DependencyDefinitionInterface<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps> = {
  defineStateDependency<Key extends string, T>(
    key: Key
  ): ControllerWithDependencies<
      Name, StoredState, FullState & Record<Key, T>, Children, StateDeps & Record<Key, Observable<T>>, EventDeps
    >;
  // TODO payload could be empty
  defineEventDependency<Key extends string, Payload>(
    key: Key
  ): ControllerWithDependencies<Name, StoredState, FullState, Children, StateDeps, EventDeps & Record<Key, Payload>>;
}

type DerivedStateDefinitionInterface<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState> = {
  defineDerivedState<P extends string, S1, V>(
    property: P, uses: [Use<FullState, S1>], selector: (a1: S1) => V
  ): ControllerWithDerivedState<Name, StoredState, FullState & Record<P, V>, Children, StateDeps, EventDeps, DerivedState & Record<P, V>>;
  defineDerivedState<P extends string, S1, S2, V>(
    property: P, uses: [Use<FullState, S1>, Use<FullState, S1>], selector: (a1: S1, a2: S2) => V
  ): ControllerWithDerivedState<Name, StoredState, FullState & Record<P, V>, Children, StateDeps, EventDeps, DerivedState & Record<P, V>>;
}

type EventsDefinitionInterface<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState> = {
  defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
  ): ControllerWithEvents<Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, EventEmitterMapOf<EventList>>;
}

type StateDependenciesResolverArguments<StoredState, DerivedState, StateDeps, Children> = {
  stored: Observable<StoredState>;
  derived: { [K in keyof DerivedState]: Observable<DerivedState[K]> };
  dependencies: { [K in keyof StateDeps]: Observable<StateDeps[K]> };
  children: Children; // TODO finish
}

type RemoveResolved<Deps, Resolved, Keys = U.ListOf<keyof Deps>, Acc = {}> =
  Keys extends []
    ? Acc
    : Keys extends [infer X, ...infer XS]
      ? X extends keyof Deps
        ? X extends keyof Resolved
          ? keyof Deps[X] extends keyof Resolved[X]
            ? RemoveResolved<Deps, Resolved, XS, Acc>
            : RemoveResolved<Deps, Resolved, XS, Acc & Record<X, Pick<Deps[X], Exclude<keyof Deps[X], keyof Resolved[X]>>>>
          : RemoveResolved<Deps, Resolved, XS, Acc & Record<X, Deps[X]>>
        : never
      : never

type DependenciesResolverDefinitionInterface<
  Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState,
  EventEmitterMap extends Record<string, (args: any) => void>, StateDescendantDeps, EventDescendantDeps,
   UndefinedResolver extends 'defineStateDependenciesResolver' | 'defineEventDependenciesResolver'  =
  'defineStateDependenciesResolver' | 'defineEventDependenciesResolver'
  > =  Pick<{
    defineStateDependenciesResolver<T extends Partial<StateDescendantDeps>>(
      resolver: (args: StateDependenciesResolverArguments<StoredState, DerivedState, StateDeps, Children>) => T
    ): ControllerWithDependenciesResolver<
      Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, EventEmitterMap,
      RemoveResolved<StateDescendantDeps, T>, EventDescendantDeps,
      Exclude<UndefinedResolver, 'defineStateDependenciesResolver'>
      >;
    defineEventDependenciesResolver<T extends Partial<EventDescendantDeps>>(
      resolver: (args: any) => T
    ): ControllerWithDependenciesResolver<
      Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState,  EventEmitterMap,
      StateDescendantDeps, RemoveResolved<EventDescendantDeps, T>,
      Exclude<UndefinedResolver, 'defineEventDependenciesResolver'>
      >;
  }, UndefinedResolver>


type ControllerPublicInterface<
  Name extends string, FullState, StateDeps, EventDeps, DerivedState, EventEmitterMap extends Record<string, (args: any) => void>,
  StateDescendantDeps, EventDescendantDeps
  > = {
    getViewInterface(): ControllerViewInterface<FullState, EventEmitterMap>;
    getDerivedState(): DerivedState;
    getParentInterface(): ControllerParentInterface<
      Name, StateDeps, EventDeps, StateDescendantDeps, EventDescendantDeps
    >;
  }

// type E = Exclude<'asd', 'asd'> extends never ? 1 : 2

//  === Partial controller types ===
//
type ControllerWithDependenciesResolver<
    Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState,
    EventEmitterMap extends Record<string, (args: any) => void>, StateDescendantDeps, EventDescendantDeps,
    UndefinedResolver extends 'defineStateDependenciesResolver' | 'defineEventDependenciesResolver'
  > =
   DependenciesResolverDefinitionInterface<
     Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, EventEmitterMap, StateDescendantDeps,
     EventDescendantDeps, UndefinedResolver
   > &
   ControllerPublicInterface<
     Name, FullState, StateDeps, EventDeps, DerivedState, EventEmitterMap, StateDescendantDeps, EventDescendantDeps
   >

type ControllerWithEvents<
  Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, EventEmitterMap extends Record<string, (args: any) => void>,
  StateDescendantDependencies = GetStateDescendantsDependencies<Children>,
  EventDescendantDependencies = GetEventDescendantsDependencies<Children>,
  > =
  DependenciesResolverDefinitionInterface<
    Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, EventEmitterMap, StateDescendantDependencies, EventDescendantDependencies
  > &
  ControllerPublicInterface<
    Name, FullState, StateDeps, EventDeps, DerivedState, EventEmitterMap, StateDescendantDependencies, EventDescendantDependencies
  >;

// type ControllerWithResolvedDependencies<Name> =

type ControllerWithName<Name extends string> = {
  defineStoredState<StoredState>(initialStoredState: StoredState): ControllerWithStoredState<Name, StoredState>;
}

type ControllerWithStoredState<Name extends string, StoredState> =
  DependencyDefinitionInterface<Name, StoredState, StoredState, [], {}, {}> &
  DerivedStateDefinitionInterface<Name, StoredState, StoredState, [], {}, {}, {}> &
  EventsDefinitionInterface<Name, StoredState, StoredState, [], {}, {}, {}> &
  ChildrenDefinitionInterface<Name, StoredState>
  ;

type ControllerWithChildren<Name extends string, StoredState, Children> =
  DependencyDefinitionInterface<Name, StoredState, StoredState, Children, {}, {}> &
  DerivedStateDefinitionInterface<Name, StoredState, StoredState, Children, {}, {}, {}> &
  EventsDefinitionInterface<Name, StoredState, StoredState, Children, {}, {}, {}> &
  DependenciesResolverDefinitionInterface<
    Name, StoredState, {}, [],  {}, {}, {}, {}, GetStateDescendantsDependencies<Children>, GetEventDescendantsDependencies<Children>
  >
  ;
type ControllerWithDerivedState<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState> =
  DerivedStateDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState> &
  EventsDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState>;

type ControllerWithDependencies<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps> =
  DependencyDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps> &
  DerivedStateDefinitionInterface<
    Name, StoredState,  { [K in keyof FullState]: FullState[K] }, Children, { [K in keyof StateDeps]: StateDeps[K] },
   { [K in keyof EventDeps]: EventDeps[K] }, []
  > &
  EventsDefinitionInterface<
    Name, StoredState, StoredState, Children, { [K in keyof StateDeps]: StateDeps[K] },
    { [K in keyof EventDeps]: EventDeps[K] }, []
  >
  ;

type _EventEmitterMapOf<T, Acc = {}> =
  T extends []
    ? Acc
    : T extends [Event<infer Name, any, any, infer Args>, ...infer XS]
      ? _EventEmitterMapOf<XS, Acc & Record<Name, (args: Args) => void>>
      : never;

type EventEmitterMapOf<List> = List extends Array<infer T>
  ? U.ListOf<T> extends Array<Event<string, any, any, any>> ? _EventEmitterMapOf<U.ListOf<T>> : never
  : never

type DerivedStateDescription = {
  property: string;
  uses: Array<Use<any, any>>;
  selector(...args: any[]): any;
}

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
    StoredState, Children, FullState, StateDeps, EventDeps,
    >(
      initialStoredState: StoredState,
      children: Children,
      stateDependencyKeys: string[],
      eventDependencyKeys: string[],
  ): DependencyDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps> {
    return {
      defineStateDependency<Key extends string, T>(
        key: Key,
      ): ControllerWithDependencies<
              Name, StoredState, FullState & Record<Key, T>, Children, StateDeps & Record<Key, Observable<T>>, EventDeps
            > {
        return makeControllerWithDepedencies(initialStoredState, children, [...stateDependencyKeys, key], eventDependencyKeys);
      },
      defineEventDependency<Key extends string, Payload>(
        key: Key
      ): ControllerWithDependencies<Name, StoredState, FullState, Children, StateDeps, EventDeps & Record<Key, Payload>> {
        return makeControllerWithDepedencies(initialStoredState, children, stateDependencyKeys, [...eventDependencyKeys, key]);
      },
    }
  };


  function getDerivedStateDefinitionInterface<
    StoredState, Children, FullState, StateDeps, EventDeps, DerivedState,
  >(
    initialStoredState: StoredState,
    children: Children,
    stateDependencyKeys: string[],
    eventDependencyKeys: string[],
    derivedStateDescription: DerivedStateDescription[],
  ): DerivedStateDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState> {
    return {
      defineDerivedState<P extends string, V>(
        property: P, uses: Array<Use<FullState, any>>, selector: (...args: any[]) => V
      ): ControllerWithDerivedState<
           Name, StoredState, FullState & Record<P, V>, Children, StateDeps, EventDeps, DerivedState & Record<P, V>
         > {
        return makeContollerWithDerivedState(
          initialStoredState,
          children,
          stateDependencyKeys,
          eventDependencyKeys,
          [...derivedStateDescription, { property, uses, selector }]
        );
      }
    }
  }

  function getEventsDefinitionInterface<
    StoredState, Children, FullState, StateDeps, EventDeps, DerivedState
  >(
    initialStoredState: StoredState,
    children: Children,
    stateDependencyKeys: string[],
    eventDependencyKeys: string[],
    derivedStateDescription: DerivedStateDescription[]
  ): EventsDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState> {
    return {
      defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
        getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
      ): ControllerWithEvents<
           Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, EventEmitterMapOf<EventList>
         > {
        return makeControllerWithEvents(
          initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateDescription, getEvents
        );
      }
    };
  };


  function getChildrenDefinitionInterface<StoredState>(
    initialStoredState: StoredState
  ): ChildrenDefinitionInterface<Name, StoredState> {
    return {
      defineChildren<Children extends Array<ControllerParentInterface<string, any, any, any, any>>>(
        children: Children,
      ): ControllerWithChildren<Name, StoredState, Children extends Array<infer T> ? U.ListOf<T> : never> {
        return makeControllerWithChildren(initialStoredState, children as any);
      }
    }
  };

  function getStateDependenciesResolverDefinitionInterface<
    StoredState, Children, FullState, StateDeps, EventDeps, DerivedState,
    // EventEmitterMap extends Record<string, (args: any) => void>,
    StateDescendantDeps, EventDescendantDeps,
    EventList extends Array<Event<string, FullState, StoredState, any>>,
    // UndefinedResolver extends 'defineStateDependenciesResolver' | 'defineEventDependenciesResolver'  =
    // 'defineStateDependenciesResolver' | 'defineEventDependenciesResolver'
  >(
    initialStoredState: StoredState,
    children: Children,
    stateDependencyKeys: string[],
    eventDependencyKeys: string[],
    derivedStateAcc: DerivedStateDescription[],
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList,
    resolvers: DependencyResolvers,
    // TODO fix desc deps (last arg)
  ): DependenciesResolverDefinitionInterface<
    Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, {}, StateDescendantDeps,
    EventDescendantDeps
  > {
    const state: Pick<DependenciesResolverDefinitionInterface<
      Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, {}, StateDescendantDeps,
      EventDescendantDeps
    >, 'defineStateDependenciesResolver'> | {} = resolvers.state ? {
      defineStateDependenciesResolver: resolver =>
        makeControllerWithResolver(
          initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateAcc,
          getEvents, {...resolvers, state: resolver}
        ),
    } : {};

    const events: Pick<DependenciesResolverDefinitionInterface<
      Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState, {}, StateDescendantDeps,
      EventDescendantDeps
    >, 'defineStateDependenciesResolver'> | {} = resolvers.events ? {
      defineStateDependenciesResolver: resolver =>
        makeControllerWithResolver(
          initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateAcc,
          getEvents, {...resolvers, events: resolver},
        ),
    } : {};

    return {...state, ...events} as any;
  }

  function getPublicInterface<
    StoredState, Children, FullState, StateDeps, EventDeps, DerivedState,
    EventEmitterMap extends Record<string, (args: any) => void>,
    StateDescendantDeps, EventDescendantDeps, EventList extends Array<Event<string, FullState, StoredState, any>>,
    >(
    initialStoredState: StoredState,
    children: Children,
    stateDependencyKeys: string[],
    eventDependencyKeys: string[],
    derivedStateAcc: DerivedStateDescription[],
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList,
    dependencyResolvers: DependencyResolvers,
  ): ControllerPublicInterface<
      Name, FullState, StateDeps, EventDeps, DerivedState, EventEmitterMap, StateDescendantDeps, EventDescendantDeps
  > {

      console.log('>> unused deps', children, eventDependencyKeys, dependencyResolvers);

      let stateDependencyStreams = stateDependencyKeys
        .reduce<Record<string, Observable<any> | null>>((acc, x) => ({...acc, [x]: null}), {});

      const derivedStateStreams = derivedStateAcc
        .reduce<Record<string, Observable<any> | null>>((acc, x) => ({...acc, [x.property]: null}), {});

      const storedStateStream = new BehaviorSubject(initialStoredState);

      const storedStateKeys = Object.keys(initialStoredState);

      function getUseStream(use: Use<any, any>) {
        const path: string[] = use(getPathTrackingProxy()).getPath;
        const first = path[0];

        if (storedStateKeys.includes(first)) {
          return storedStateStream.pipe(
            o.map(state => use(state)),
            o.distinctUntilChanged(),
          );
        }

        if (derivedStateAcc.some(x => x.property === first)) {
          return derivedStateStreams[first];
        }

        if (stateDependencyKeys.includes(first)) {
          if (stateDependencyStreams[first] === null) {
            console.error('could not convert use to stream, dependency', first, 'is not initialized');
            return of(null);
          }
          return stateDependencyStreams[first];
        }

        console.error('could not convert use to stream, unknown use path');

        return of(null);
      }

      function getFullStateStream(): Observable<FullState> {
        const dependencyStreamEntries = Object.entries(stateDependencyStreams);

        if (dependencyStreamEntries.some(([_, stream]) => stream === null)) {
          const unmetDeps = dependencyStreamEntries
            .filter(([_, stream]) => stream === null)
            .map((([key]) => key));
          console.error('state dependencies were not fulfilled:', unmetDeps)
          return of(null as any);
        }

        derivedStateAcc.forEach(x => {
          const streams = x.uses.map(getUseStream);

          derivedStateStreams[x.property] = combineLatest(streams).pipe(
            o.map(args => x.selector(...args))
          )
        });

        const derivedStateStreamEntries = Object.entries(derivedStateStreams)
        const derivedStateStream = combineLatest(derivedStateStreamEntries.map(x => x[1])).pipe(
          o.map(stateArray => stateArray.reduce(
            (acc, x, index) => ({
              ...acc,
              [derivedStateStreamEntries[index][0]]: x
            }), {}))
        );

        return combineLatest(
          [storedStateStream, derivedStateStream, ...dependencyStreamEntries.map(x => x[1]!)]
        ).pipe(
          o.map(([storedState, derivedState, ...dependencyState]) => ({
            ...storedState,
            ...derivedState,
            ...dependencyState.reduce((acc, x, index) => ({
              ...acc,
              [dependencyStreamEntries[index][0]]: x,
            }), {}),
          })));
      }

      let fullStateStream: Observable<FullState> | null = null;
      let fullStateForHookStream: Observable<FullState> | null = null;

      let initialFullState: null | FullState = null;

      const getInitialFullState = (): FullState => {
        fullStateStream = getFullStateStream();
        fullStateForHookStream = fullStateStream.pipe(o.skip(1))

        configureEventEmitters(fullStateStream);
        const initialFullStateStream = fullStateStream.pipe(o.take(1));

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

      const rawEventNotificationStream = new Subject<EventNotification<any>>();

      const makeEvent = <Name extends string, Args>(
        name: Name, handler: EventHandler<FullState, StoredState, Args>
      ): Event<Name, FullState, StoredState, Args> => {
        return {
          name,
          handler,
          emit: (args: Args) => rawEventNotificationStream.next({ eventName: name, payload: args }),
        };
      }

      const events = getEvents({ makeEvent });

      const eventEmitters = events.reduce<EventEmitterMap>((acc, x) => ({ ...acc, [x.name]: x.emit }), {} as EventEmitterMap);

      function configureEventEmitters(fullStateStream: Observable<FullState>): void {
        const eventHandlers = events.reduce<Record<string, EventHandler<FullState, StoredState, any>>>((acc, x) => ({
          ...acc,
          [x.name]: x.handler,
        }), {})

        const eventNotificationWithFullStateStream = rawEventNotificationStream.pipe(o.withLatestFrom(fullStateStream));

        eventNotificationWithFullStateStream.subscribe(([notification, state]) => {
          const nextState = eventHandlers[notification.eventName](state, notification.payload);
          if (nextState instanceof Observable) {
            nextState.subscribe(storedStateStream)
          } else {
            storedStateStream.next(nextState)
          }
        });
      }

      dependencyResolvers.events{}

      return {
        getViewInterface() {
          return {
            methods: eventEmitters,
            useState: () => {
              const [state, setState] = React.useState<FullState>(getInitialFullState);

              React.useEffect(() => {
                fullStateForHookStream!.subscribe(newState => setState(newState));
              });
              return state;
            },
          };
        },

        getParentInterface() {
          return {
            name,
            initializeStateDependencies: deps => {
              Object.assign(stateDependencyStreams, deps);
            },
            initializeEventDependencies: () => null as any,
            getDescendantDependencies: null as any,
          }
        },
        getDerivedState: null as any,


      }
    }

  function makeControllerWithResolver<
    StoredState, Children, FullState, StateDeps, EventDeps,  DerivedState,
  EventEmitterMap extends Record<string, (args: any) => void>, StateDescendantDeps, EventDescendantDeps,
  EventList extends Array<Event<string, FullState, StoredState, any>>,
  UndefinedResolver extends 'defineStateDependenciesResolver' | 'defineEventDependenciesResolver'  =
    'defineStateDependenciesResolver' | 'defineEventDependenciesResolver'
    >(
      initialStoredState: StoredState,
      children: Children,
      stateDependencyKeys: string[],
      eventDependencyKeys: string[],
      derivedStateAcc: DerivedStateDescription[],
      getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList,
      resolvers: DependencyResolvers,
    ): ControllerWithDependenciesResolver<Name, StoredState, FullState, Children, StateDeps, EventDeps,
  DerivedState, EventEmitterMap, StateDescendantDeps, EventDescendantDeps, UndefinedResolver> {
      return {
        ...getStateDependenciesResolverDefinitionInterface(
          initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateAcc, getEvents, resolvers
        ) as any, // TODO fix
        ...getPublicInterface(
          initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateAcc, getEvents, resolvers,
        )
      }
    }

  function makeControllerWithChildren<StoredState, Children>(
      initialStoredState: StoredState,
      children: Children extends Array<infer T> ? U.ListOf<T> : never,
    ): ControllerWithChildren<Name, StoredState, Children extends Array<infer T> ? U.ListOf<T> : never> {
    return {
      ...getDerivedStateDefinitionInterface(initialStoredState, children, [], [], []),
      ...getDependenciesDefinitionInterface(initialStoredState, children, [], []),
      ...getEventsDefinitionInterface(initialStoredState, children, [], [], []),
      ...getStateDependenciesResolverDefinitionInterface(initialStoredState, children, [], [], [], () => [], {}) as any, // TODO fix
    };
  }

  function makeControllerWithStoredState<StoredState>(initialStoredState: StoredState): ControllerWithStoredState<Name, StoredState> {
    return {
      ...getDependenciesDefinitionInterface(initialStoredState, [], [], []),
      ...getEventsDefinitionInterface(initialStoredState, [], [], [], []),
      ...getDerivedStateDefinitionInterface(initialStoredState, [], [], [], []),
      ...getChildrenDefinitionInterface(initialStoredState),
    };
  }

  function makeContollerWithDerivedState<
    StoredState, FullState, Children, StateDeps, EventDeps, DerivedState
  >(
    initialStoredState: StoredState,
    children: Children,
    stateDependencyKeys: string[],
    eventDependencyKeys: string[],
    derivedStateDescription: DerivedStateDescription[],
  ): ControllerWithDerivedState<Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState> {

    return {
      ...getDerivedStateDefinitionInterface(initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateDescription),
      ...getEventsDefinitionInterface(initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateDescription)
    };
  }

  function makeControllerWithDepedencies<
    StoredState, Children, FullState, StateDeps, EventDeps
  >(
    initialStoredState: StoredState,
    children: Children,
    stateDependencyKeys: string[],
    eventDependencyKeys: string[],
  ): ControllerWithDependencies<Name, StoredState, FullState, Children, StateDeps, EventDeps> {

    return {
      ...getDependenciesDefinitionInterface(initialStoredState, children, stateDependencyKeys, eventDependencyKeys),
      ...getDerivedStateDefinitionInterface(initialStoredState, children, stateDependencyKeys, eventDependencyKeys, [] ),
      ...getEventsDefinitionInterface(initialStoredState, children, stateDependencyKeys, eventDependencyKeys, []),
    }
  }


  function makeControllerWithEvents<
    StoredState, Children, FullState, StateDeps, EventDeps, DerivedState, EventEmitters extends Record<string, (args: any) => void>,
  EventList extends Array<Event<string, FullState, StoredState, any>>
    >(
    initialStoredState: StoredState,
    children: Children,
    stateDependencyKeys: string[],
    eventDependencyKeys: string[],
    derivedStateAcc: DerivedStateDescription[],
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList,
  ): ControllerWithEvents<Name, StoredState, FullState, Children, StateDeps, EventDeps, DerivedState,  EventEmitters> {
      return {
        ...getStateDependenciesResolverDefinitionInterface(
          initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateAcc, getEvents, {},
        ) as any, // TODO fix
        ...getPublicInterface(
          initialStoredState, children, stateDependencyKeys, eventDependencyKeys, derivedStateAcc, getEvents, {},
        )
      }

    }
}

type PathTracker = {
  getPath: string[]
}

function getPathTrackingProxy(pathAcc: string[] = []): PathTracker {
  return new Proxy<PathTracker>({ getPath: [] }, {
    get(_, prop, ) {
      // TODO replace with symbol
      return prop === 'getPath'
        ? pathAcc
        : getPathTrackingProxy([...pathAcc, prop as string])
    }
  });
}
