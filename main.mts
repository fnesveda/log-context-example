import log, { withLogContext, type LogContext } from './log.mjs';

// This service will have an automatically generated label, and no extra data.
@withLogContext()
class ServiceA {
    // The nested service calls here will merge their log contexts with the log context of this service.
    async run() {
        log.info('Running');
        await this.innerMethod();
        await serviceB.run();
        await serviceC.run();
        await serviceD1.run();
        await serviceD2.run();
    }
    
    // If you call an inner method, the log context in the log will not be duplicated
    async innerMethod() {
        log.info('Inner method');
    }
}

// This service will have a custom label, and no extra data.
@withLogContext({ label: 'CustomServiceBLabel' })
class ServiceB {
    async run() {
        log.info('Running');
        await serviceC.run();
    }
}

// This service will have an automatically generated label, and extra data.
@withLogContext({ data: { customServiceCLogData: 'Hello, world!' } })
class ServiceC {
    async run() {
        // The extra data from the `log.info()` call will be merged with the data from the log context.
        log.info('Running', { customLogMessageData: 'How are you?' });
    }
}

// This service will have a dynamic label, and no extra data.
@withLogContext()
class ServiceD {
    // Unfortunately decorators can't be used to add properties to the class, so we have to add the property manually.
    // https://github.com/Microsoft/TypeScript/issues/4881
    logContext: LogContext; 

    constructor(private readonly label: string) {
        this.logContext = { label };
    }

    async run() {
        log.info('Running');
    }
}

const serviceA = new ServiceA();
const serviceB = new ServiceB();
const serviceC = new ServiceC();
const serviceD1 = new ServiceD('DynamicLabel1');
const serviceD2 = new ServiceD('DynamicLabel2');

await serviceA.run();
