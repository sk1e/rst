import { U } from 'ts-toolbelt';
import { BehaviorSubject, Subject, Observable, combineLatest, Subscriber } from 'rxjs';
import * as o from 'rxjs/operators';
import * as React from 'react';

type Use<State, T> = (state: State) => T;

type ControllerViewInterface<State, Methods extends Record<string, (args: any) => void>> = {
  methods: Methods;
  useState(): State;
}

type DependencyResolvers<StoredState, DerivedState, StateDeps, Children> = Partial<{
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

 // === Partial controller types ===

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
    resolvers: DependencyResolvers<any, any, any, any>,
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
    dependencyResolvers: DependencyResolvers<any, any, any, any>,
  ): ControllerPublicInterface<
      Name, FullState, StateDeps, EventDeps, DerivedState, EventEmitterMap, StateDescendantDeps, EventDescendantDeps
  > {
      console.log('>> unused deps', children, eventDependencyKeys, dependencyResolvers);

      const storedStateKeys = Object.keys(initialStoredState);

      type AbstractMultipleDependency = {
        stateKeys: string[]
      };

      type FullStateDependency = AbstractMultipleDependency & {
        kind: 'full-state';
      };

      type StoredAndDerivedStateDependency = AbstractMultipleDependency & {
        kind: 'stored-and-derived';
      };

      type DerivedStateSumDependency = AbstractMultipleDependency & {
        kind: 'derived-state-sum';
      };

      type DerivedStateDependency = AbstractMultipleDependency & {
        kind: 'derived-state';
        dependentStateDescription: DerivedStateDescription;
      };

      type IntermediateSingleDependency = {
        kind: 'intermediate-single';
        path: string[];
        stateKey: string;
      };

      type Dependency =
        | FullStateDependency
        | StoredAndDerivedStateDependency
        | DerivedStateSumDependency
        | DerivedStateDependency
        | IntermediateSingleDependency;

      function getDependencyStateKeys(x: Dependency): string[] {
        return x.kind === 'intermediate-single'
          ? [x.stateKey]
          : x.stateKeys;
      }

      const predefinedStateKeys = {
        fullState: ':fullState:',
        storedAndDerivedState: ':stored-and-derived-state:',
        derivedState: ':derivedState:',
        storedState: ':storedState:',
      };

      const stateKeyToDependencyMap: Record<string, Dependency> = {
        [predefinedStateKeys.fullState]: { kind: 'full-state', stateKeys: [predefinedStateKeys.storedAndDerivedState, ...stateDependencyKeys] },
        [predefinedStateKeys.storedAndDerivedState]: { kind: 'stored-and-derived', stateKeys: [predefinedStateKeys.storedState, predefinedStateKeys.derivedState] },
        [predefinedStateKeys.derivedState]: { kind: 'derived-state-sum', stateKeys: derivedStateAcc.map(x => x.property) },
        ...derivedStateAcc.reduce((acc: Record<string, DerivedStateDependency>, x): Record<string, DerivedStateDependency> => {
          const keys = x.uses.map(use => {
            const path: string[] = use(getPathTrackingProxy()).getPath;
            return path.join('.');
          })
          return {
            ...acc,
            [x.property]: {
              kind: 'derived-state',
              dependentStateDescription: x,
              stateKeys: keys,
            },
          };
        }, {}),
        ...derivedStateAcc.reduce((acc, x) => {
          return x.uses.reduce((acc2: Record<string, IntermediateSingleDependency>, use): Record<string, IntermediateSingleDependency> => {
            const path: string[] = use(getPathTrackingProxy()).getPath;
            const firstKey = path[0];
            const stateKey = path.join('.');
            return storedStateKeys.includes(firstKey)
           ? {...acc2, [stateKey]: { kind: 'intermediate-single', stateKey: predefinedStateKeys.storedState, path }}
            : path.length > 1
              ? { ...acc2, [stateKey]: { kind: 'intermediate-single', stateKey: firstKey, path, }}
              : acc2;
          }, acc);
        }, {}),
      }

      const dependencyStateKeyToDependentStateKeyMap: Record<string, string[]> = Object.entries(stateKeyToDependencyMap)
        .reduce((acc, [holderKey, dependency]) =>
          getDependencyStateKeys(dependency).reduce((acc2: Record<string, string[]>, x) => ({
            ...acc2,
            [x]: [...(acc2[x] || []), holderKey],
          }), acc), { [predefinedStateKeys.fullState]: [] as string[] });

      const stateKeyToDependencyEmitterMap: Record<string, Subscriber<[string, Observable<any>]>> = {};
      const stateKeyToStreamMap: Record<string, Observable<any>> = {};

      Object.entries(stateKeyToDependencyMap).map(([stateKey, dependency]) => makeStream(stateKey, dependency))

      console.log('>> stateKeyToDependencyMap', stateKeyToDependencyMap)
      console.log('>> dependencyStateKeyToDependentStateKeyMap', dependencyStateKeyToDependentStateKeyMap)

      function onStateStreamReceive(key: string, stream: Observable<any>) {
        stateKeyToStreamMap[key] = stream;
        dependencyStateKeyToDependentStateKeyMap[key].forEach(x => {
          stateKeyToDependencyEmitterMap[x].next([key, stream])
        });
      }

      function makeStream(stateKey: string, dependency: Dependency) {
        let dependencyStreamEmitter: Subscriber<[string, Observable<any>]> | null = null;
        const streamOfDependencyStreams = new Observable<[string, Observable<any>]>(emit => dependencyStreamEmitter = emit);

        const dependenciesNumber = getDependencyStateKeys(dependency).length;

        switch (dependency.kind) {
          case 'full-state': {
            streamOfDependencyStreams.pipe(
              o.take(dependenciesNumber),
              o.toArray()
            ).subscribe(keyStreamPairs => {
              const storedAndDerivedKeyIndex = keyStreamPairs.findIndex(x => x[0] === predefinedStateKeys.storedAndDerivedState);
              if (storedAndDerivedKeyIndex === -1) {
                console.error('no stored and dervied state in full state dependencies');
              } else {
                const storedAndDerivedStateStream = keyStreamPairs[storedAndDerivedKeyIndex][1];
                const keyStreamPairsForExternalDependencyState = [
                  ...keyStreamPairs.slice(0, storedAndDerivedKeyIndex),
                  ...keyStreamPairs.slice(storedAndDerivedKeyIndex + 1, keyStreamPairs.length)
                ];

                onStateStreamReceive(stateKey, combineLatest([
                  storedAndDerivedStateStream,
                  ...keyStreamPairsForExternalDependencyState.map(x => x[1])
                ]).pipe(
                  o.map(([storedAndDerived, ...external]) =>
                    external.reduce((acc, x, index) => ({
                      ...acc,
                      [keyStreamPairsForExternalDependencyState[index][0]]: x,
                    }), storedAndDerived))))
              }
            });

            break;
          }

          case 'stored-and-derived': {
            streamOfDependencyStreams.pipe(
              o.take(2),
              o.toArray()
            ).subscribe(([keyStreamPairX, keyStreamPairY]) => {
              onStateStreamReceive(stateKey, combineLatest([keyStreamPairX[1], keyStreamPairY[1]]).pipe(
                o.map(([x, y]) => ({...x, ...y})),
              ));
            });

            break;
          }

          case 'derived-state-sum': {
            streamOfDependencyStreams.pipe(
              o.take(dependenciesNumber),
              o.toArray(),
            ).subscribe(keyStreamPairs => {
              onStateStreamReceive(stateKey, combineLatest(keyStreamPairs.map(x => x[1])).pipe(
                o.map(ys => ys.reduce((acc, y, index) => ({
                  ...acc,
                  [keyStreamPairs[index][0]]: y,
                }), {}))
              ))
            });

            break;
          }

          case 'derived-state': {
            streamOfDependencyStreams.pipe(
              o.take(dependenciesNumber),
              o.toArray(),
            ).subscribe(keyStreamPairs => {
              const { dependentStateDescription } = dependency;

              const useKeys = dependentStateDescription.uses.map(use => use(getPathTrackingProxy()).getPath);
              const orderedKeyStreamPairs = keyStreamPairs.sort(([key1], [key2]) => {
                const indexOf1 = useKeys.indexOf(key1);
                const indexOf2 = useKeys.indexOf(key2)

                return indexOf1 > indexOf2
                  ? 1
                  : indexOf1 < indexOf2
                  ? -1
                  : 0;
              });

              onStateStreamReceive(stateKey, combineLatest(orderedKeyStreamPairs.map(x => x[1])).pipe(
                o.map(args => dependentStateDescription.selector(...args))
              ));
            });

            break;
          }

          case 'intermediate-single': {
            streamOfDependencyStreams.subscribe(([_, dependencyStream]) => {
              onStateStreamReceive(stateKey, dependencyStream.pipe(
                o.map(state => getPropertyByPath(dependency.path, state)),
                o.distinctUntilChanged(),
              ));
            });

            break;
          }
        }

        stateKeyToDependencyEmitterMap[stateKey] = dependencyStreamEmitter!;
      }

      const getInitialFullState = (): FullState => {
        let initialFullState: null | FullState = null;

        const fullStateStream = stateKeyToStreamMap[predefinedStateKeys.fullState];
        if (fullStateStream === undefined) {
          console.error('stream was not initialized');
          // TODO return reasonable defaults
          return null as any;
        }

        configureEventEmitters(fullStateStream);

        fullStateStream.pipe(o.take(1)).subscribe(state => {
            initialFullState = state as FullState;
          });

        if (initialFullState === null) {
          console.error('initial state was not initialized');
          return null as any;
        }

        return initialFullState;
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

      const storedStateStream = new BehaviorSubject(initialStoredState);

      onStateStreamReceive(predefinedStateKeys.storedState, storedStateStream);

      return {
        getViewInterface() {
          return {
            methods: eventEmitters,
            useState: () => {
              const [state, setState] = React.useState<FullState>(getInitialFullState);

              React.useEffect(() => {
                const fullStateStream = stateKeyToStreamMap[predefinedStateKeys.fullState];
                if (fullStateStream !== undefined) {
                  fullStateStream.pipe(o.skip(1))
                    .subscribe(newState => setState(newState));
                }
              }, []);
              return state;
            },
          };
        },

        getParentInterface() {
          return {
            name,
            initializeStateDependencies: deps => {
              return deps as any;
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
      resolvers: DependencyResolvers<any, any, any, any>,
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

function getPropertyByPath(path: string[], obj: Record<string, any>): any {
  const property = obj[path[0]];
  return path.length === 1
    ? property
    : getPropertyByPath(path.slice(1), property);
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
