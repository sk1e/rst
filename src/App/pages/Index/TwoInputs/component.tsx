import * as React from 'react';

import { views } from './state';

export function TwoInputs() {

  return (
    <div>
      <h3>TwoInputs</h3>
      <views.InputA />
      <br />
      <views.InputB />
    </div>
  )
}
