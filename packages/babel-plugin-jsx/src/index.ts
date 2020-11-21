import * as t from '@babel/types';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import { addNamed, isModule, addNamespace } from '@babel/helper-module-imports';
import { NodePath } from '@babel/traverse';
import tranformVueJSX from './transform-vue-jsx';
import sugarFragment from './sugar-fragment';

export type State = {
  get: (name: string) => any;
  set: (name: string, value: any) => any;
  opts: Opts;
}

export interface Opts {
  transformOn?: boolean;
  optimize?: boolean;
  mergeProps?: boolean;
  isCustomElement?: (tag: string) => boolean;
}

export type ExcludesBoolean = <T>(x: T | false | true) => x is T;

const hasJSX = (parentPath: NodePath) => {
  let fileHasJSX = false;

  parentPath.traverse({
    JSXElement(path) { // skip ts error
      fileHasJSX = true;
      path.stop();
    },
    JSXFragment(path) {
      fileHasJSX = true;
      path.stop();
    },
  });

  return fileHasJSX;
};

export default () => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    Program: {
      enter(path: NodePath, state: State) {
        if (hasJSX(path)) {
          const importNames = [
            'createVNode',
            'Fragment',
            'resolveComponent',
            'withDirectives',
            'vShow',
            'vModelSelect',
            'vModelText',
            'vModelCheckbox',
            'vModelRadio',
            'vModelText',
            'vModelDynamic',
            'resolveDirective',
            'mergeProps',
            'createTextVNode',
          ];
          if (isModule(path)) {
            // import { createVNode } from "vue";
            const importMap: Record<string, t.Identifier> = {};
            importNames.forEach((name) => {
              state.set(name, () => {
                if (importMap[name]) {
                  return importMap[name];
                }
                const identifier = addNamed(
                  path,
                  name,
                  'vue',
                  {
                    importedInterop: 'uncompiled',
                    ensureLiveReference: true,
                  },
                );
                importMap[name] = identifier;
                return identifier;
              });
            });
          } else {
            // var _vue = require('vue');
            let sourceName = '';
            importNames.forEach((name) => {
              state.set(name, () => {
                if (!sourceName) {
                  sourceName = addNamespace(
                    path,
                    'vue',
                    {
                      importedInterop: 'uncompiled',
                      ensureLiveReference: true,
                    },
                  ).name;
                }
                return t.memberExpression(t.identifier(sourceName), t.identifier(name));
              });
            });
          }
        }
      },
    },
    ...tranformVueJSX,
    ...sugarFragment,
  },
});
