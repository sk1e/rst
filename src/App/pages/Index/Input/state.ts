import { makeStateController } from './lib';

type S = {
  value: string;
}

const controller = makeStateController<S>({ value: 'privet' })
  .defineDerivedState({
    property: 'valueLength',
    uses: [
      state => state.value,
    ],
    select: (value) => value.length,
  })
  .defineDerivedState({
    property: 'halfOfValueLength',
    uses: [
      state => state.valueLength,
    ],
    select: (a) => a as any / 2
  });


controller.stream.subscribe(x => {
  console.log('>> subscribe A', x);
});

controller.stream.subscribe(x => {
  console.log('>> subscribe B', x);
});
