// import { useEffect, useState } from 'react';
import * as R from 'ramda';
import { Subject, BehaviorSubject } from 'rxjs';
import * as o from 'rxjs/operators';
// import * as rx from 'rxjs';

// rx.mergeAll

// rx
//   .zip(
//     rx.of(1, 2, 3),
//     rx.of('a', 'b', 'c'),
//   )
//   .pipe(o.map(([n, c]) => ({ n, c })))
//   .subscribe(console.log)


// rx
//   .zip(
//     rx.of(1, 2, 3),
//     rx.of('a', 'b', 'c'),
//   )
//   .pipe(o.map(([n, c]) => ({ n, c })))
//   .subscribe(console.log)


// rx
//   .zip({
//     n: rx.of(1, 2, 3),
//     c: rx.of('a', 'b', 'c'),
//   })
//   .subscribe(console.log)


type StoredState = {
  value: string;
  withBlueBorder: boolean;
}

type DerivedState = {
  valueLength: number;
  halfOfValueLength: number;
}

type State = StoredState & DerivedState;

type SetValue = {
  type: 'set-value';
  payload: { value: string };
};

const setValueStream = new Subject<SetValue>();

function dispatchSetValue(a: SetValue) {
  setValueStream.next(a);
}

const initialStoredState: StoredState = {
  value: '',
  withBlueBorder: false,
}

const storedStateStream = new BehaviorSubject<StoredState>(initialStoredState);


type Lens = {
  getFocus(): string[];
}

export function makeEmptyLens(): Lens {
  function proxyTree(lensAcc: string[]): Lens {
    return new Proxy(
      { getFocus: () => lensAcc } as Lens,
      {
        get: (obj, key) => key === 'getFocus'
          ? obj.getFocus
          : proxyTree(lensAcc.concat(key as string))
      }
    )
  }

  return proxyTree([]);
}

const derivedStateStream = addDerivedStateToStream({
  halfOfValueLength: {
    uses: [
      state => state.valueLength,
    ],
    select: x => x / 2,
  },
  valueLength: {
    uses: [
      state => state.value,
    ],
    select: value => value.length,
  },
});

// R.mapObjIndexed((stream, prop) => {
//   stream.subscribe(x => {
//     console.log('>> update derived', prop, x);
//   });
// }, derivedStateStream);

export type LensOf<T> = {
  [P in keyof T]: T[P] extends Record<string, any> ? LensOf<T[P]> : Lens
}


export type DerivedStateElementDescription = {
  uses: Array<(state: LensOf<State>) => Lens>;
  select(...args: any): any;
}

type DerivedStateDescription = Record<string, DerivedStateElementDescription>

// type DerivedStateElementDependency = {
//   stream: Subject<any>;
//   lensFocus: string[];
// }

// new BehaviorSubject()

// type Selector = (state: any) => any;

type DerivedStateSelector = {
  selectedProperty: string;
  select(state: any): any;
}

function getArrangedSelectors(derivedStateDescription: DerivedStateDescription): DerivedStateSelector[] {
  function loop(
    arrangedSelectorAcc: DerivedStateSelector[],
    arrangedDerivedStatePropAcc: string[],
    entriesToArrange: Array<[string, DerivedStateElementDescription]>
  ): DerivedStateSelector[] {
    if (entriesToArrange.length === 0) {
      return arrangedSelectorAcc;
    }

    const [nextArrangedEntriesChunk, nextEntriesToArrange] = R.partition(x => x[1].uses.every(getLens => {
      const lens = getLens(makeEmptyLens() as any);
      const focusHead = lens.getFocus()[0];

      return arrangedDerivedStatePropAcc.includes(focusHead) || focusHead in storedStateStream.getValue();

    }), entriesToArrange)

    const nextArrangedDerivedStatePropAcc = arrangedDerivedStatePropAcc
      .concat(nextArrangedEntriesChunk.map(x => x[0]));

    const nextArrangedSelectorAcc = arrangedSelectorAcc
      .concat(nextArrangedEntriesChunk.map<DerivedStateSelector>(x => {
        const [derivedStateProperty, derivedStateElement] = x;
        const selectorsOfDependencies = derivedStateElement.uses
          .map(getLens => (state: any) => {
            const focus = getLens(makeEmptyLens() as any).getFocus();
            return R.view(R.lensPath(focus), state);
          })

        return {
          selectedProperty: derivedStateProperty,
          select: state => derivedStateElement.select(...selectorsOfDependencies.map(f => f(state))),
        };
      }));


    return loop(nextArrangedSelectorAcc, nextArrangedDerivedStatePropAcc, nextEntriesToArrange);
  }

  return loop([], [], Object.entries(derivedStateDescription));
}


// function sortDescription(derivedStateDescription: DerivedStateDescription): string[] {
//   function loop(acc: string[], entriesToSort: Array<[string, DerivedStateElementDescription]>): string[] {
//     if (entriesToSort.length === 0) {
//       return acc;
//     }

//     const [nextDerivedStateElements, nextEntriesToSort] = R.partition(x => x[1].uses.every(getLens => {
//       const lens = getLens(makeEmptyLens() as any);
//       const focusHead = lens.getFocus()[0];

//       return acc.includes(focusHead) || focusHead in storedStateStream.getValue();

//     }), entriesToSort)

//     return loop(nextDerivedStateElements.map(x => x[0]), nextEntriesToSort);
//   }

//   return loop([], Object.entries(derivedStateDescription));
// }

function addDerivedStateToStream(derivedStateDescription: DerivedStateDescription) {
  const arrangedSelectors = getArrangedSelectors(derivedStateDescription);

  return storedStateStream.pipe(o.map(state => arrangedSelectors.reduce((acc, x) => ({
    ...acc,
    [x.selectedProperty]: x.select(acc),
  }), state)));
}


// storedStateStream.subscribe(state => {

// })

setValueStream.subscribe(action => {
  storedStateStream.next({ value: action.payload.value, withBlueBorder: false });
})

// setNumberStream.subscribe(action => {
//   console.log('>> got', action);
// })

// setNumberStream.subscribe(action => {
//   console.log('>> received', action);
// })



derivedStateStream.subscribe(x =>
  console.log('>> derived state A', x));

derivedStateStream.subscribe(x =>
  console.log('>> derived state B', x));

storedStateStream.subscribe(state => {
  console.log('>> render', state);
})

dispatchSetValue({ type: 'set-value', payload: { value: 'one' } });
dispatchSetValue({ type: 'set-value', payload: { value: 'two' } });


// function useStateStream() {
//   const [a, b] = useState()
// }
