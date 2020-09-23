import { U } from 'ts-toolbelt';
import { BehaviorSubject, Subject, Observable, combineLatest } from 'rxjs';
import * as o from 'rxjs/operators';
import * as React from 'react';

type Use<State, T> = (state: State) => T;

type ControllerViewInterface<State, Methods extends Record<string, (args: any) => void>> = {
  methods: Methods;
  useState(): State;
}

// type E = 'Hello';

// type T = `Privet ${E}.${E}`
// type F = `em ${T}`
// const e: F = 'em Privet Hello.Hello'
//

export type ControllerParentInterface<Name extends string, Children, StateDeps, EventDeps, ViewDeps, DescendantsDeps> = {
  name: Name;
  getDescendantDependencies(): DescendantsDeps;
  initializeDependencies(dependencies: GetChildrenDependencies<Children> & { state: StateDeps, events: EventDeps, view: ViewDeps }): void;
}

// type E = keyof {}

export type GetStateDescendantsDependencies<Children, Acc = {}> =
  Children extends []
  ? Acc
  : Children extends [ControllerParentInterface<infer ChildName, any, infer ChildStateDeps, any, any, infer ChildDescendantDeps>, ...infer XS]
    ? keyof ChildDescendantDeps extends never
      ? keyof ChildStateDeps extends never
        ? GetStateDescendantsDependencies<XS, Acc>
        : GetStateDescendantsDependencies<XS, Acc & Record<ChildName, ChildStateDeps>>
      : keyof ChildDescendantDeps extends string
        ? GetStateDescendantsDependencies<
           XS,
           Acc &
           { [K in keyof ChildDescendantDeps as `${ChildName}.${K}`]: ChildDescendantDeps[K] } &
           (keyof ChildStateDeps extends never
             ? {}
             : Record<ChildName, ChildStateDeps>)
           >
        : never
    : never;


// export type GetDescendantsDependencies<Children, Acc = {}> =
//   Children extends []
//   ? Acc
//   : Children extends [ControllerParentInterface<infer ChildName, any, infer OwnDeps, infer ChildDescendantDeps>, ...infer XS]
//     ? keyof ChildDescendantDeps extends never
//       ? DependenciesAreEmpty<OwnDeps> extends 1
//         ? GetDescendantsDependencies<XS, Acc>
//         : GetDescendantsDependencies<XS, Acc & Record<ChildName, OwnDeps>>
//       : keyof ChildDescendantDeps extends string
//         ? GetDescendantsDependencies<
//            XS,
//            Acc &
//            { [K in keyof ChildDescendantDeps as `${ChildName}.${K}`]: ChildDescendantDeps[K] } &
//            DependenciesAreEmpty<OwnDeps> extends 1
//              ? {}
//              : Record<ChildName, OwnDeps>
//            >
//         : boolean
//     : number;

// export type GetDescendantsDependencies<Children, Acc = {}> =
//   Children extends []
//   ? {}
//   : Children;

// type GetDescendantsDependencies<Children, Acc = {}> =
//   Children extends []
//   ? Acc
//   : Children extends [ControllerParentInterface<infer ChildName, any, any, infer ChildDescendantDeps>, ...infer XS]
//     ? keyof ChildDescendantDeps extends never
//       ? GetDescendantsDependencies<XS, Acc>
//       : keyof ChildDescendantDeps extends string
//         ? GetDescendantsDependencies<XS, Acc & { [K in keyof ChildDescendantDeps as `${ChildName}.${K}`]: ChildDescendantDeps[K] }>
//         : boolean
//     : number;


// type GetDescendantsDependencies<Children, Acc = {}> =
//   Children extends []
//   ? Acc
//   : Children extends [ControllerParentInterface<infer Name, any, any, infer DescendantDeps>, ...infer XS]
//     ? keyof DescendantDeps extends string
//       ? GetDescendantsDependencies<XS, Acc & WithPrefix<keyof DescendantDeps, DescendantDeps, Name>>
//       : never
//     : never;

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
  defineChildren<Children extends Array<ControllerParentInterface<string, any, any, any, any, any>>>(
    chlidren: Children
  ): ControllerWithChildren<Name, StoredState, Children extends Array<infer T> ? U.ListOf<T> : never>;
}

type DependencyDefinitionInterface<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> = {
  defineStateDependency<Key extends string, T>
    (): ControllerWithDependencies<Name, StoredState, FullState & Record<Key, T>, Children, StateDeps & Record<Key, T>, EventDeps, ViewDeps>;
  // TODO payload could be empty
  defineEventDependency<Key extends string, Payload>
    (): ControllerWithDependencies<Name, StoredState, FullState, Children, StateDeps, EventDeps & Record<Key, Payload>, ViewDeps>;
  defineViewDependency<Key extends string, Props = {}>
    (): ControllerWithDependencies<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps & Record<Key, Props>>;
}

type DerivedStateDefinitionInterface<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> = {
  defineDerivedState<P extends string, S1, V>(
    property: P, uses: [Use<FullState, S1>], selector: (a1: S1) => V
  ): ControllerWithDerivedState<Name, StoredState, FullState & Record<P, V>, Children, StateDeps, EventDeps, ViewDeps>;
  defineDerivedState<P extends string, S1, S2, V>(
    property: P, uses: [Use<FullState, S1>, Use<FullState, S1>], selector: (a1: S1, a2: S2) => V
  ): ControllerWithDerivedState<Name, StoredState, FullState & Record<P, V>, Children, StateDeps, EventDeps, ViewDeps>;
}

type EventsDefinitionInterface<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> = {
  defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
  ): ControllerWithEvents<Name, FullState, Children, StateDeps, EventDeps, ViewDeps, EventEmitterMapOf<EventList>>;
}

type ChildrenDependenciesResolverArguments<FullState> = {
  state: FullState;
}

type CollectResolvedDependencies<Deps extends Partial<Dependencies<any, any, any>>, Keys = U.ListOf<keyof Deps>, Acc extends any[] = []> =
  Keys extends []
   ? Acc
   : Keys extends [infer X, ...infer XS]
     ? X extends keyof Deps
       ? CollectResolvedDependencies<Deps, XS, [...Acc, ...CollectResolvedSubDependencies<Deps[X], X>]>
       : never
     : never

type CollectResolvedSubDependencies<Rec, K, Keys=U.ListOf<keyof Rec>, Acc extends any[]=[]> =
  Keys extends []
   ? Acc
   : Keys extends [infer X, ...infer XS]
     ? CollectResolvedSubDependencies<Rec, K, XS, [...Acc, [K, X]]>
     : never;

type ResolvedDependenciesTuples<DescDeps> = {
  [K in keyof DescDeps]: CollectResolvedDependencies<DescDeps[K]>;
}

type a1 = {
  a: 1;
  b: 2;
  c: 3;
}

type a2 = {
  a: 1;
  b: 2;
}

// type m = 'a' | 'b' extends 'a' | 'b' | 'c' ? 1 : 2
// type m1 = 'a' | 'b' | 'c' | 'd' extends 'a' | 'b' | 'c' ? 1 : 2
// type m2 = 'a' | 'b' | 'c' extends 'a' | 'b' | 'c' ? 1 : 2
// type m3 =  keyof a2 extends keyof a1 ? 1 : 2
// type m4 = 'a' | 'b' | 'c' | 'd' extends 'a'  ? 1 : 2
//
// type M = Exclude<1 | 2 | 3, 2 | 3>

type RemoveResolved<Deps, Resolved, Keys=U.ListOf<keyof Deps>, Acc={}> =
  Keys extends []
    ? Acc
    : Keys extends [infer X, ...infer XS]
      ? X extends keyof Deps
        ? X extends keyof Resolved
          ? keyof Deps[X] extends keyof Resolved[X]
            ? RemoveResolved<Deps, Resolved, XS, Acc>
            : RemoveResolved<Deps, Resolved, XS, Acc & Record<X, Pick<Deps[X], Exclude<keyof Deps[X], keyof Resolved[X]>>>>
          : RemoveResolved<Deps, Resolved, XS, Acc & Record<X, Deps[X]>>
        : 1
      : ['wat', Keys, keyof Deps]

// type Res = RemoveResolved<D, R>

// type E = Pick<D['Input'], 'firstName' | 'age'>
// const q: Res = {
//   Input: {
//     age: 1,
//     secondName: 'asd',
//   },
// }

// type RemoveResolved<Deps, Resolved, Acc=Deps> =
//   Resolved extends []
//     ? Acc
//     : Resolved extends [[infer P1, infer P2], ...infer XS]
//       ? P1 extends keyof Acc
//         ? P2 extends keyof Acc[P1]
//           ? keyof Omit<Acc[P1], P2> extends never
//             ? RemoveResolved<Deps, XS, Omit<Acc, P1>>
//             : RemoveResolved<Deps, XS, Omit<Acc, P1> & Record<P1, Omit<Acc[P1], P2>>>
//         : never
//       : never
//     : never

// type RMap = ResolvedDependenciesTuples<ResolvedMap>;
// type E = Omit
// type Rm = RemoveResolved<DescDeps['Input'], RMap['Input']>

// const q: Rm = {
//   events: {e2: 'ou'}

// };

// type R = RemoveDependencies<DescDeps, ResolvedMap>;

// const q: R = {
//   Input: {events: {e2: 'ou'}, state: {}}
// }

// type RemoveDependencies<
//   DescDeps,
//   ResolvedDepsWithMap,
//   ResolvedDepsWithTuples = ResolvedDependenciesTuples<ResolvedDepsWithMap>
// > = {
//   [K in keyof DescDeps]: K extends keyof ResolvedDepsWithTuples ? RemoveResolved<DescDeps[K], ResolvedDepsWithTuples[K]> : never
// }

// type A = Dependencies<{a: 1}, {}, {b: 2}>

type StateDependenciesResolverDefinitionInterface<
  Name extends string,
FullState,
Children,
StateDeps,
EventDeps,
ViewDeps,
EventEmitterMap extends Record<string, (args: any) => void>,
StateDescendantDependencies,
  > = {
  defineStateDependenciesResolver<T extends Partial<StateDescendantDependencies>>(
    resolver: (args: ChildrenDependenciesResolverArguments<FullState>) => T
  ): FinalController<Name, FullState, Children, StateDeps, EventDeps, ViewDeps, EventEmitterMap, RemoveResolved<StateDescendantDependencies, T>>
}

type ControllerPublicInterface<
  Name extends string,
  FullState,
  Children,
  StateDeps,
  EventDeps,
  ViewDeps,
  EventEmitterMap extends Record<string, (args: any) => void>,
StateDescendantDeps
  > = {
    getViewInterface(): ControllerViewInterface<FullState, EventEmitterMap>;
    getParentInterface(): ControllerParentInterface<Name, Children, StateDeps, EventDeps, ViewDeps, StateDescendantDeps>;
  }

//  === Partial controller types ===
//
type FinalController<
  Name extends string,
  FullState,
  Children,
  StateDeps,
  EventDeps,
  ViewDeps,
  EventEmitterMap extends Record<string, (args: any) => void>,
  StateDescendantDeps
  > = ControllerPublicInterface<Name, FullState, Children, StateDeps, EventDeps, ViewDeps, EventEmitterMap, StateDescendantDeps>;

type ControllerWithEvents<
  Name extends string,
  FullState,
  Children,
  StateDeps,
  EventDeps,
  ViewDeps,
  EventEmitterMap extends Record<string, (args: any) => void>,
  StateDescendantDependencies = GetStateDescendantsDependencies<Children>
  > =
  StateDependenciesResolverDefinitionInterface<Name, FullState, Children, StateDeps, EventDeps, ViewDeps, EventEmitterMap, StateDescendantDependencies> &
  ControllerPublicInterface<Name, FullState, Children, StateDeps, EventDeps, ViewDeps, EventEmitterMap, StateDescendantDependencies>;

// type ControllerWithResolvedDependencies<Name> =

type ControllerWithName<Name extends string> = {
  defineStoredState<StoredState>(initialStoredState: StoredState): ControllerWithStoredState<Name, StoredState>;
}

type ControllerWithStoredState<Name extends string, StoredState> =
  DependencyDefinitionInterface<Name, StoredState, StoredState, [], {}, {}, {}> &
  DerivedStateDefinitionInterface<Name, StoredState, StoredState, [], {}, {}, {}> &
  EventsDefinitionInterface<Name, StoredState, StoredState, [], {}, {}, {}> &
  ChildrenDefinitionInterface<Name, StoredState>
;

type ControllerWithChildren<Name extends string, StoredState, Children> =
  DependencyDefinitionInterface<Name, StoredState, StoredState, Children, {}, {}, {}> &
  DerivedStateDefinitionInterface<Name, StoredState, StoredState, Children, {}, {}, {}> &
  EventsDefinitionInterface<Name, StoredState, StoredState, Children, {}, {}, {}> &
  StateDependenciesResolverDefinitionInterface<Name, StoredState, Children, {}, {}, {}, {}, GetStateDescendantsDependencies<Children>>
;
type ControllerWithDerivedState<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> =
  DerivedStateDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> &
  EventsDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps>;

type ControllerWithDependencies<Name extends string, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> =
  DependencyDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> &
  DerivedStateDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> &
  EventsDefinitionInterface<Name, StoredState, StoredState, Children, StateDeps, EventDeps, ViewDeps>
  ;

// type GetChildrenDependencies<Children, Acc = {}> =
//   Children extends []
//     ? Acc
//     : Children extends [ControllerParentInterface<infer Name, infer GrandChildren, infer OwnDeps, any>, ...infer XS]
//       ? GetChildrenDependencies<XS, Acc & Record<Name, GrandChildren & OwnDeps>>
//       : never;

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
  Children,
  FullState,
  StateDeps,
  EventDeps,
  ViewDeps,
    >(
    initialStoredState: StoredState,
    children: Children,
  ): DependencyDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> {
    return {
      defineStateDependency<Key extends string, T>
        (): ControllerWithDependencies<Name, StoredState, FullState & Record<Key, T>, Children, StateDeps & Record<Key, T>, EventDeps, ViewDeps> {
        return makeControllerWithDepedencies(initialStoredState, children);
      },
      defineEventDependency<Key extends string, Payload>
        (): ControllerWithDependencies<Name, StoredState, FullState, Children, StateDeps, EventDeps & Record<Key, Payload>, ViewDeps> {
        return makeControllerWithDepedencies(initialStoredState, children);
      },
      defineViewDependency<Key extends string, Props = {}>
        (): ControllerWithDependencies<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps & Record<Key, Props>> {
        return makeControllerWithDepedencies(initialStoredState, children);
      },
    }
  };


  function getDerivedStateDefinitionInterface<
    StoredState,
  Children,
  FullState,
  StateDeps,
  EventDeps,
  ViewDeps
    >(
    initialStoredState: StoredState,
    children: Children,
    derivedStateDescription: DerivedStateDescription[],
  ): DerivedStateDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> {
    return {
      defineDerivedState<P extends string, V>(
        property: P, uses: Array<Use<FullState, any>>, selector: (...args: any[]) => V
      ): ControllerWithDerivedState<Name, StoredState, FullState & Record<P, V>, Children, StateDeps, EventDeps, ViewDeps> {
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
  Children,
  FullState,
  StateDeps,
  EventDeps,
  ViewDeps
    >(
    initialStoredState: StoredState,
    children: Children,
    derivedStateDescription: DerivedStateDescription[]
  ): EventsDefinitionInterface<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> {
    return {
      defineEvents<EventList extends Array<Event<string, FullState, StoredState, any>>>(
        getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList
      ): ControllerWithEvents<Name, FullState, Children, StateDeps, EventDeps, ViewDeps, EventEmitterMapOf<EventList>> {
        return makeFinalController(initialStoredState, children, derivedStateDescription, getEvents);
      }
    };
  };


  function getChildrenDefinitionInterface<StoredState>(
    initialStoredState: StoredState
  ): ChildrenDefinitionInterface<Name, StoredState> {
    return {
      defineChildren<Children extends Array<ControllerParentInterface<string, any, any, any, any, any>>>(
        children: Children,
      ): ControllerWithChildren<Name, StoredState, Children extends Array<infer T> ? U.ListOf<T> : never> {
        return makeControllerWithChildren(initialStoredState, children);
      }
    }
  };

  function getStateDependenciesResolverDefinitionInterface<
    StoredState,
    Children,
    FullState,
    StateDeps,
    EventDeps,
    ViewDeps
    >(
    _initialStoredState: StoredState,
      _children: Children,
      // TODO fix desc deps (last arg)
  ): StateDependenciesResolverDefinitionInterface<
    Name,
  FullState,
  Children,
  StateDeps,
  EventDeps,
  ViewDeps,
  {},
  GetStateDescendantsDependencies<Children>
  > {
      return null as any
    }

  function makeControllerWithChildren<
    StoredState,
  Children
    >(
    initialStoredState: StoredState,
    children: Children,
  ): ControllerWithChildren<Name, StoredState, Children> {
    return {
      ...getDerivedStateDefinitionInterface(initialStoredState, children, []),
      ...getDependenciesDefinitionInterface(initialStoredState, children),
      ...getEventsDefinitionInterface(initialStoredState, children, []),
      ...getStateDependenciesResolverDefinitionInterface(initialStoredState, children),
    };
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
  Children,
  StateDeps,
  EventDeps,
  ViewDeps
    >(
    initialStoredState: StoredState,
    children: Children,
    derivedStateDescription: DerivedStateDescription[],
  ): ControllerWithDerivedState<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> {

    return {
      ...getDerivedStateDefinitionInterface(initialStoredState, children, derivedStateDescription),
      ...getEventsDefinitionInterface(initialStoredState, children, derivedStateDescription)
    };
  }

  function makeControllerWithDepedencies<
    StoredState,
  Children,
  FullState,
  StateDeps,
  EventDeps,
  ViewDeps
  >(
    initialStoredState: StoredState,
      children: Children,
  ): ControllerWithDependencies<Name, StoredState, FullState, Children, StateDeps, EventDeps, ViewDeps> {

    return {
      ...getDependenciesDefinitionInterface(initialStoredState, children),
      ...getDerivedStateDefinitionInterface(initialStoredState, children, []),
      ...getEventsDefinitionInterface(initialStoredState, children, []),
    }
  }


  function makeFinalController<
    StoredState,
     Children,
    FullState,
    StateDeps,
    EventDeps,
    ViewDeps,
    EventEmitters extends Record<string, (args: any) => void>,
    EventList extends Array<Event<string, FullState, StoredState, any>>
  >(
    initialStoredState: StoredState,
    children: Children,
    derivedStateAcc: DerivedStateDescription[],
    getEvents: (args: GetEventsArguments<FullState, StoredState>) => EventList,
  ): ControllerWithEvents<Name, FullState, Children, StateDeps, EventDeps, ViewDeps, EventEmitters> {

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
