import { AsyncLocalStorage } from 'node:async_hooks';

// The log context consists of a service label, and extra data that is added to the log message.
export type LogContext = {
    label?: string;
    data?: Record<string, unknown>;
}

// The log context stack is kept in a global variable, so that even if users are using multiple versions of the log library,
// they will still share the same context stack.
declare global {
    var logContextStack: AsyncLocalStorage<LogContext[]>;
}
global.logContextStack = new AsyncLocalStorage<LogContext[]>();

// This decorator adds a log context to a class.
// Every time a method in this class uses the log library, the log context will be added to the log message.
// The log contexts are stacked, so that if a method calls another method from another class log context,
// both log contexts will be added to the log message.
export function withLogContext(logContext?: LogContext) {
    return function <TargetClass extends { new (...args: any[]): any }>(
        target: TargetClass,
        decoratorContext: ClassDecoratorContext
    ): TargetClass {
        return class extends target {
            constructor(...args: any[]) {
                super(...args);

                // This proxy is used to wrap all methods in the class.
                // The methods are wrapped so that when they are called, the log context of the decorated class is added to the log context stack.
                return new Proxy(this, {
                    get(target, prop) {
                        const value = Reflect.get(target, prop);
                        if (typeof value === 'function') {
                            return (...args: any[]) => {
                                const currentContextStack = global.logContextStack.getStore() ?? [];
                                const newContextStack = [
                                    ...currentContextStack,
                                    {
                                        label: target?.logContext?.label ?? logContext?.label ?? decoratorContext.name,
                                        data: { ...logContext?.data, ...target?.logContext?.data },
                                    },
                                ];
                                return global.logContextStack.run(newContextStack, () => (value as Function).call(target, ...args));
                            };
                        }
                        return value;
                    },
                });
            }
        };
    }
}

// Dummy logger implementation, just for demonstration
export class Log {
    log(level: string, message: string, data?: Record<string, unknown>) {
        const logContextStack = global.logContextStack.getStore() ?? [];
        const logContextLabels = logContextStack.map(context => context.label);
        const logContextData = logContextStack.reduce((acc, context) => ({ ...acc, ...context.data }), {});
        const logData = { ...logContextData, ...data };

        let logMessage = `[${level}] `;
        if (logContextLabels.length) {
            logMessage += `${logContextLabels.join(' > ')}: `;
        }
        logMessage += message;
        if (Object.keys(logData).length) {
            logMessage += ` (${JSON.stringify(logData)})`;
        }

        console.log(logMessage);
    }
    
    info(message: string, data?: Record<string, unknown>) {
        this.log('INFO', message, data);
    }
}

export default new Log();
