// Global definitions (you shouldn't import it, it is global scope)
/* eslint-disable */

declare var __HOST__: string;

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module 'normalizr';
declare module '*.scss';
declare module '*.png';
declare module 'react-hot-loader';
declare module 'enzyme-adapter-react-16';

declare module 'postcss-reporter';
declare module 'postcss-scss';

declare module 'thread-loader';
declare module 'doiuse';
declare module 'stylelint';
declare module 'favicons-webpack-plugin';
declare module 'circular-dependency-plugin';
declare module 'filemanager-webpack-plugin';
