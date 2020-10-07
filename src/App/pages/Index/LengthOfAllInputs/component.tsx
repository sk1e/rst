import * as React from 'react';

import { useState } from './state';

export function LengthOfAllInputs() {
  const state = useState();

  return (
    <div style={{ border: '1px solid black', padding: 3 }}>
      <h3>LengthOfAllInputs</h3>
      <div>
        {state.text}
      </div>
    </div>
  );
}
