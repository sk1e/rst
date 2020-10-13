import * as React from 'react';

import { useState, methods } from './controller';

export function Table() {
  const state = useState();

  // state.Data.GetDetailedScientistList.
  console.log('>> state', state, methods);
  // state.Data.GetDetailedScientistList

  return (
    <div>
      <h4>Table</h4>
    </div>
  );
}
