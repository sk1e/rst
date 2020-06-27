import React from 'react';
import { Route, BrowserRouter } from 'react-router-dom';

import * as pages from './pages';

export function App() {

  return (
    <>
      <BrowserRouter>
        <Route path="/" component={pages.Index} />
      </BrowserRouter>
    </>
  );
}
