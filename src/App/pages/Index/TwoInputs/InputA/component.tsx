import * as React from 'react';

import { useState, methods } from './state';

export function InputA() {
  const state = useState();

  return (
    <div style={{ border: '1px solid black', padding: 3 }}>
      <h4>Input A</h4>
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
