/* @flow */

import { hasOwn } from 'shared/util';
import { warn, hasSymbol } from '../util/index';
import { defineReactive, toggleObserving } from '../observer/index';

export function initProvide(vm: Component) {
    const provide = vm.$options.provide;
    if (provide) {
        vm._provided = typeof provide === 'function' ? provide.call(vm) : provide;
    }
}

// 先inject  再data/props  然后provide  在data/props中可以使用inject
//使用inject配置的key从当前组件读取，如果没有值，则读取父组件，以此类推，最终将内容保存在实例this中，这样就可以直接在this中读取值
export function initInjections(vm: Component) {
    const result = resolveInject(vm.$options.inject, vm);
    if (result) {
        // 不应该转换为响应式
        toggleObserving(false);
        Object.keys(result).forEach(key => {
            /* istanbul ignore else */
            if (process.env.NODE_ENV !== 'production') {
                defineReactive(vm, key, result[key], () => {
                    warn(
                        `Avoid mutating an injected value directly since the changes will be ` +
                            `overwritten whenever the provided component re-renders. ` +
                            `injection being mutated: "${key}"`,
                        vm
                    );
                });
            } else {
                defineReactive(vm, key, result[key]);
            }
          });
        //应该转换为响应式
        toggleObserving(true);
    }
}

export function resolveInject(inject: any, vm: Component): ?Object {
    // 根据用户提供的inject，自底向上搜索可用的注入内容，将结果返回
    if (inject) {
        const result = Object.create(null);
        const keys = hasSymbol ? Reflect.ownKeys(inject) : Object.keys(inject);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            // 已经被观测了
            if (key === '__ob__') continue;
            const provideKey = inject[key].from;
            let source = vm;
            while (source) {
                if (source._provided && hasOwn(source._provided, provideKey)) {
                    result[key] = source._provided[provideKey];
                    break;
                }
                source = source.$parent;
            }
            if (!source) {
                if ('default' in inject[key]) {
                    const provideDefault = inject[key].default;
                    result[key] =
                        typeof provideDefault === 'function'
                            ? provideDefault.call(vm)
                            : provideDefault;
                } else if (process.env.NODE_ENV !== 'production') {
                    warn(`Injection "${key}" not found`, vm);
                }
            }
        }
        return result;
    }
}
