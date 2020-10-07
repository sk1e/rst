import * as React from 'react';

import { useState, methods } from './state';

export function InputB() {
  const state = useState();

  console.log('>> state of B', state);

  return state && (
    <input
      type="text"
      value={state.value}
      onChange={(e) => {
        // console.log('>> new value', e.target.value);
        methods.setValue({ newValue: e.target.value })
      }} />
  );
}
