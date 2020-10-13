import { makeViewController, Event } from 'rst';
// import { makeViewController } from 'rst';
import { U } from 'ts-toolbelt';
import * as XML from 'xml-js'

type CallState<T> =
  | InitialState
  | PendingState
  | ErrorState
  | SuccessfullState<T>

type InitialState = {
  kind: 'initial';
};

type PendingState = {
  kind: 'pending';
}

type ErrorState = {
  kind: 'error';
  message: string;
}

type SuccessfullState<T> = {
  kind: 'successfull';
  data: T;
}

const request = {
  Request: {
    _attr: { commandName: 'GetDetailedScientistList', version: '0.0.0-SNAPSHOT', workbench: 'rnd' },
    Grid: { _attr: { rowQuantity: 50, startRow: 0 } },
    Parameters: {
      Parameter: [
        { _attr: { name: 'extended', value: false } },
        { _attr: { name: 'TSUPersons', value: true } },
        { _attr: { name: 'TSUAspDocs', value: false } },
        { _attr: { name: 'TSUStudents', value: false } },
        { _attr: { name: 'OtherPersons', value: false } },
        { _attr: { name: 'Actual', value: true } },
      ],
    }
  }
}


const body = XML.js2xml(request, { compact: true, spaces: 4, attributesKey: '_attr' });

fetch("msa/service/commands/GetDetailedScientistList", {
// fetch("api/users", {
  "headers": {
    "Content-type": "application/xml",
  },
  "body": body,
  "method": "POST",
}).then(response => response.text())
  .then(text => {
    const data = XML.xml2js(text, { compact: true });
    console.log('>> data', data);
    // setData(data);
  });

// type RequestConfig<Id extends string, Arguments> = {
//   id: Id;
//   toCompactElemenConverter(args: Arguments): XML.ElementCompact;
// }

type RequestConfig<Args, Data> = {
  toCompactElemenConverter(args: Args): XML.ElementCompact;
  getData(): Data;
}

function makeRequestConfig<Args, Data>(
  toCompactElemenConverter: (args: Args) => XML.ElementCompact,
  getData: () => Data,
): RequestConfig<Args, Data> {
  return { toCompactElemenConverter, getData };
}

const requestMap = {
  GetDetailedScientistList: makeRequestConfig(
    (args: { extended: boolean }) => {
      return {
        Request: {
          _attr: { commandName: 'GetDetailedScientistList', version: '0.0.0-SNAPSHOT', workbench: 'rnd' },
          Grid: { _attr: { rowQuantity: 50, startRow: 0 } },
          Parameters: {
            Parameter: [
              { _attr: { name: 'extended', value: args.extended } },
              { _attr: { name: 'TSUPersons', value: true } },
              { _attr: { name: 'TSUAspDocs', value: false } },
              { _attr: { name: 'TSUStudents', value: false } },
              { _attr: { name: 'OtherPersons', value: false } },
              { _attr: { name: 'Actual', value: true } },
            ],
          }
        }
      }
    },
    () => [1, 2]
  ),
    GetUserList: makeRequestConfig(
    (args: { extended: boolean }) => {
      return {
        Request: {
          _attr: { commandName: 'GetUsersList', version: '0.0.0-SNAPSHOT', workbench: 'rnd' },
          Grid: { _attr: { rowQuantity: 50, startRow: 0 } },
          Parameters: {
            Parameter: [
              { _attr: { name: 'extended', value: args.extended } },
              { _attr: { name: 'TSUPersons', value: true } },
              { _attr: { name: 'TSUAspDocs', value: false } },
              { _attr: { name: 'TSUStudents', value: false } },
              { _attr: { name: 'OtherPersons', value: false } },
              { _attr: { name: 'Actual', value: true } },
            ],
          }
        }
      }
    },
    () => ['asd'],
  )
}


type RequestMap = typeof requestMap;

type ServiceStoredStateOf<Keys, Acc = {}> =
  Keys extends []
   ? Acc
   : Keys extends [infer Key, ...infer XS]
     ? Key extends keyof RequestMap
       ? RequestMap[Key] extends RequestConfig<any, infer Data>
         ? ServiceStoredStateOf<XS, Acc & Record<Key, Data>>
         : never
       : never
     : never;


type TupleOf<A> = A extends Array<infer T> ? U.Last<_TupleOf<T>> : never
type _TupleOf<U, Acc extends any[] = [], X =U.Last<U>, XS = Exclude<U, X>> =
  U extends X
    ? [...Acc, X]
    : _TupleOf<XS, [...Acc, X]>

export type CallEventsOf<Keys, Acc extends Array<Event<any, any, any, any>> = []> =
  Keys extends []
    ? Acc
    : Keys extends [infer Key, ...infer XS]
      ? Key extends keyof RequestMap
        ? RequestMap[Key] extends RequestConfig<infer Args, any>
          ? CallEventsOf<XS, [...Acc, Event<Key, any, any, Args>]>
          : never
       : never
    : never

export function makeDataService<T extends Array<keyof typeof requestMap>>(calls: T) {
  const initialState = calls
    .reduce<Record<string, InitialState>>(
      (acc, x) => ({ ...acc, [x]: { kind: 'initial' } }), {}
    );

  return makeViewController('Data')
    // .defineStoredState<Record<string, CallState<any>>>(initialState)
    .defineStoredState<ServiceStoredStateOf<TupleOf<T>>>(initialState as any)
    .defineEvents(({ makeEvent }) => {
      const setCallState = makeEvent(
        'setCallState',
        ({ call, callState }: { call: string, callState: CallState<any> }, state) =>
          ({ ...(state as any), [call]: callState }));

      const callEvents: any[] = calls.map(x => makeEvent(x, (args: any) => {
        console.log('>> server call with args', args)
        setCallState.emit({ call: x, callState: { kind: 'pending' } });
      })) as any;


      // const callEvents: any[] = []

      return [...callEvents, setCallState];

    })
  .getPublicInterface()
  .getParentInterface()
  // ;
}

// const k = makeDataService(['GetUserList', 'GetDetailedScientistList'])

// k.getViewInterface().methods.GetDetailedScientistList({extended})
