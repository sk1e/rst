import { makeStateController } from './lib';

type S = {
  value: string;
  n: number;
}

// const c = makeStateController<S>({ value: 'privet', n: 1 })
//   .defineDerivedState('len', [(x => x.value)])

const controller = makeStateController<S>({value: 'privet', n: 1 })
  .defineDerivedState(
    'valueLength',
    [state => state.value],
    (value) => value.length,
  )
  .defineDerivedState(
    'halfOfValueLength',
    [state => state.valueLength],
    x => x / 2,
  )
  .defineEvents(makeEvent => {
    const setValue = makeEvent;

  })

controller.stream.subscribe(x => {
  console.log('>> subscribe A', x);
});

controller.stream.subscribe(x => {
  console.log('>> subscribe B', x);
});
