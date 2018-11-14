const Configuration = require('./configuration');
const error = require('./error');
const GraphQL = require('./graphql');
const Lagan = require('lagan');
const Log = require('./log');
const Server = require('./server');

class EvilEye {

    constructor(opts = {}) {

        const evilEye = this;
        this.AppError = function (msg) {
            Error.call(this, msg);
            evilEye._log.silly('New application error object instantiated.', { errorMessage: msg });
        }
        this.AppError.prototype = Error;

        this._authFns = [];

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
            log: this._log,
            lagan: this._lagan,
            auth: ({ keyId, state }) => {
                if (this._authFns.length === 0) throw new error.NoAuthFnRegistered();
                if (this._authFns.length === 1) return this._authFns[0]({ keyId, state });
                return new Promise((resolve, reject) => {
                    let failCounter = 0;
                    const authFns = [ ...(this._authFns) ];
                    authFns.forEach(authFn => {
                        return new Promise((resolve, reject) => resolve())
                            .then(() => authFn({ keyId, state }))
                            .then(secretKey => resolve(secretKey))
                            .catch(err => {
                                failCounter++;
                                if (failCounter === authFns.length) {
                                    reject(new error.AllAuthFnsFailed())
                                }
                            });
                    });
                });
            }
        });

        this._lagan.on('successfulProjection', ({ type, props, position, state }) => {
            this._log.verbose(this._log.messages.eventProjected, { eventType: type, props, position });
            this._log.silly('New state', { state });
        });

        this._lagan.on('failedPreValidation', ({ type, props, error }) => {
            this._log.verbose(this._log.messages.eventPreValidationFailed, { eventType: type, props, error: error.message });  
        });
        
        this._lagan.on('failedPostValidation', ({ type, props, error, position }) => {
            this._log.verbose(this._log.messages.eventPostValidationFailed, { eventType: type, props, error: error.message, position });  
        });
        
        this._lagan.on('failedProjection', ({ type, props, error, position }) => {
            this._log.verbose(this._log.messages.eventProjectionFailed, { eventType: type, props, error: error.message, position });  
        });

        // If using temporary/disposable event log, then allow restarts:
        
        if (!this._configuration.eventLogFile) {
            this.restart = () => {
                return this._lagan.restart();
            };
        }

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

    authFn(...args) {
        // TODO:
        // Not pretty to have this here.
        // It only exists here for exposing the authFn to the testtools.
        // Not part of public api.
        this._server.authFn(...args);
    }

    get command() {
        return this._graphql.command;
    }

    addResolver(...args) {
        return this._graphql.addResolver(...args);
    }

    addTypeDefs(...args) {
        return this._graphql.addTypeDefs(...args);
    }

    all(...args) {
        this._server.all(...args);
    }

    close() {
        this.closeEventStream();
        this._server.close();
    }

    closeEventStream() {
        this._lagan.close();
    }

    cors(domains) {
        return this._server.cors(domains);
    }

    createCommand(...args) {
        return this._graphql.createCommand(...args);
    }

    createQuery(...args) {
        return this._graphql.createQuery(...args);
    }

    delete(...args) {
        this._server.delete(...args);
    }

    get(...args) {
        this._server.get(...args);
    }

    listen(...args) {
        return this._server.listen();
    }

    post(...args) {
        this._server.post(...args);
    }

    put(...args) {
        this._server.put(...args);
    }

    registerAuthFn(fn) {
        if (typeof fn !== 'function') {
            throw new error.AuthFnIsNotAFunction();
        }
        this._authFns = [ ...(this._authFns), fn ];
    }

    staticHtdocs(directory) {
        this._server.staticHtdocs(directory);
    }

    use(...args) {
        this._server.use(...args);
    }

    get query() {
        return this._graphql.query;
    }

    get state() {
        return this._lagan.state;
    }

}

module.exports = EvilEye;
