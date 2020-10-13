import * as React from 'react';

import { views } from './controller';

export function TwoInputs() {

  return (
    <div style={{ border: '1px solid black', padding: 3 }}>
      <h3>TwoInputs</h3>
      <views.InputA />
      <br />
      <views.InputB />
    </div>
  )
}
