import * as React from 'react';

import { useState, methods } from './state';

export function Input() {
  const state = useState();

  console.log('>> state', state);

  return (
    <input
      type="text"
      value={state.fullValue}
      onChange={(e) => {
        // console.log('>> new value', e.target.value);
        methods.setValue({ newValue: e.target.value })
      }} />
  )
}
