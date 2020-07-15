import { Machine, assign, spawn } from "xstate";
import uuid from "uuid-v4";

import viewStageParameterMachine from "./viewStageParameterMachine";

const createParameter = (stage, parameter, value) => {
  return {
    id: uuid(),
    completed: false,
    parameter: parameter,
    stage: stage,
    value: value,
  };
};

export const viewStageMachine = Machine({
  id: "viewStage",
  context: {
    id: undefined,
    completed: false,
    stage: undefined,
    parameters: [],
  },
  initial: "initializing",
  states: {
    initializing: {
      entry: assign({
        parameters: (ctx, e) => {
          return ctx.parameters.map((parameters) => ({
            ...parameter,
            ref: spawn(viewStageParameterMachine.withContext(parameter)),
          }));
        },
      }),
      on: {
        "": "all",
      },
    },
    all: {},
    active: {},
    completed: {},
  },
  on: {
    "PARAMETER.COMMIT": {
      actions: [
        assign({
          parameters: (ctx, e) =>
            ctx.parameters.map((parameter) => {
              return parameter.id === e.parameter.id
                ? { ...parameter, ...e.parameter, ref: parameter.ref }
                : parameter;
            }),
        }),
      ],
    },
  },
});
