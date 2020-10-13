import * as React from 'react';

import { useState, methods } from './controller';

export function InputB() {
  const state = useState();

  return (
    <div style={{ border: '1px solid black', padding: 3 }}>
      <h4>Input B</h4>
      <div>
        {state.label}
      </div>
      <input
        type="text"
        value={state.value}
        onChange={(e) => {
          methods.setValue({ newValue: e.target.value })
        }} />
    </div>
  );
}
