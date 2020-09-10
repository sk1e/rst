import * as React from 'react';

import { useState } from './state';

export function Input() {
  const state = useState();

  console.log('>> state', state);

  return (
    <input type="text" />
  )
}
