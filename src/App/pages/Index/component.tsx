import * as React from 'react';

import { views } from './controller';

export function Index() {
  return (
    <div>
      <views.Table />
      <views.TwoInputs />
      <br />
      <views.LengthOfAllInputs />
    </div>
  )
}
