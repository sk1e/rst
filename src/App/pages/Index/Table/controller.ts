import { makeViewController } from 'rst';
import { makeDataService } from 'services/Data';

type S = {
  value: string;
};

const table = makeViewController('Table')
  .defineStoredState<S>({ value: 'i am table' })
  .defineService(makeDataService(['GetDetailedScientistList']))
  .getPublicInterface();

export const { methods, useState } = table.getViewInterface();
export const parentInterface = table.getParentInterface();
