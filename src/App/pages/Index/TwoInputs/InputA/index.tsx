import * as React from 'react';

import { useState, methods } from './state';

export function InputA() {
  const state = useState();

  console.log('>> state of A', state);

  return state && (
    <div>
      {state.label}
      <input
    type="text"
    value={state.value}
    onChange={(e) => {
      // console.log('>> new value', e.target.value);
      methods.setValue({ newValue: e.target.value })
    }} />
      </div>
  );
}
