import * as React from 'react';

import { views } from './state';

export function Index() {
  return (
    <div>
      <views.TwoInputs />
      <br />
      <views.LengthOfAllInputs />
    </div>
  )
}
