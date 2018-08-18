const Configuration = require('./configuration');
const GraphQL = require('./graphql');
const Lagan = require('lagan');
const Log = require('./log');
const Server = require('./server');

class EvilEye {

    constructor(opts = {}) {

        this._opts = opts;

        this._configuration = new Configuration({
            consoleLogLevel: opts.consoleLogLevel,
            port: opts.port
        });
        
        this._lagan = new Lagan({
            initialState: opts.initialState || {},
            logFile: this._configuration.eventLogFile
        });
        this.Event = this._lagan.Event;

        this._log = new Log({
            configuration: this._configuration
        })

		this._graphql = new GraphQL({
            configuration: this._configuration,
            lagan: this._lagan,
            log: this._log
        });

        this._server = new Server({
            configuration: this._configuration,
            graphql: this._graphql,
            log: this._log
        })

        this._lagan.on('successfulProjection', ({ type, props, position, state }) => {
            this._log.info(this._log.messages.eventProjected, { eventType: type, props, position });
            this._log.info('New state', { state });
        });

        this._lagan.on('failedPreValidation', ({ type, props, error }) => {
            this._log.info(this._log.messages.eventPreValidationFailed, { eventType: type, props, error: error.message });  
        });
        
        this._lagan.on('failedPostValidation', ({ type, props, error, position }) => {
            this._log.info(this._log.messages.eventPostValidationFailed, { eventType: type, props, error: error.message, position });  
        });
        
        this._lagan.on('failedProjection', ({ type, props, error, position }) => {
            this._log.info(this._log.messages.eventProjectionFailed, { eventType: type, props, error: error.message, position });  
        });

        // Make private properties private using Proxy:

        return new Proxy(this, {
            get(target, propKey) {

                // Hide private props:
                if (typeof propKey === 'string' && propKey.substr(0, 1) === '_') {
                    return undefined;
                }

                // Fix the scope for function calls.
                // Without it, `this` will point to the proxy object, not the target object, when functions run.
                // Don't fix for properties with upper case first letter, since that's probably a class name.
                if (typeof target[propKey] === 'function' && !propKey.substr(0, 1).match(/[A-Z]/)) {
                    return (...args) => { return target[propKey](...args); };
                }

                return target[propKey];

            },
            ownKeys(target) {
                // Hide private props:
                return Object.keys(target).filter(key => key.substr(0, 1) !== '_');
            }
        });

    }

    close() {
        this._server.close();
        this._lagan.close();
    }

    addTypeDefs(...args) {
        return this._graphql.addTypeDefs(...args);
    }

    close() {
        this._lagan.close();
        this._server.close();
    }

    createCommand(...args) {
        return this._graphql.createCommand(...args);
    }

    createQuery(...args) {
        return this._graphql.createQuery(...args);
    }

    listen(...args) {
        return this._server.listen();
    }

    get state() {
        return this._lagan.state;
    }

}

module.exports = EvilEye;