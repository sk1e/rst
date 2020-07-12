import { makeStateController } from './lib';

type S = {
  value: string;
  n: number;
}

// const c = makeStateController<S>({ value: 'privet', n: 1 })
//   .defineDerivedState('len', [(x => x.value)])

const controller = makeStateController<S>({ value: 'privet', n: 1 })
  .defineDerivedState(
    'valueLength',
    [state => state.value],
    // value => value.length,
  ),
  // .defineDerivedState({
  //   property: 'valueLength',
  //   uses: [
  //     state => state.value,
  //     state => state.n,
  //   ],
  //   select: (value) => value.length,
  // })
  // .defineDerivedState({
  //   property: 'halfOfValueLength',
  //   uses: [
  //     state => state.valueLength as any,
  //   ],
  //   select: (a) => a
  // });


  controller.stream.subscribe(x => {
    console.log('>> subscribe A', x);
  });

controller.stream.subscribe(x => {
  console.log('>> subscribe B', x);
});
