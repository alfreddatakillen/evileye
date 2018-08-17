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


        this._lagan.on('successfulProjection', ({ type, props, position }) => {
            this._log.silly(this._log.messages.eventProjected, { eventType: type, props, position });
        });
        
        this._lagan.on('failedProjection', ({ type, props, err }) => {
            this._log.debug(this._log.messages.eventProjectionFailed, { eventType: type, props, error: err.message });  
        });

        // Make private properties private using Proxy:

        return new Proxy(this, {
            get(target, propKey) {

                // Hide private props:
                if (typeof propKey === 'string' && propKey.substr(0, 1) === '_') {
                    return undefined;
                }

                // Fix the scope for function calls.
                // (Without it, `this` will point to the proxy object, not the target object, when functions run.)
                if (typeof target[propKey] === 'function') {
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
        console.log(typeof this.close);
        console.log(typeof this._server);
        this._server.close();
        this._lagan.close();
    }

    createCommand(...args) {
        return this._graphql.createCommand(...args);
    }

    listen(...args) {
        return this._server.listen();
    }

    get state() {
        return this._lagan.state;
    }

}

module.exports = EvilEye;