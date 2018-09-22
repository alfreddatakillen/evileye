const configuration = require('./configuration');
const error = require('./error');
const expressGraphql = require('express-graphql');
const { makeExecutableSchema } = require('graphql-tools');
const { formatError } = require('graphql/error');

class GraphQL {

    constructor(opts) {
        if (typeof opts !== 'object' || typeof opts.configuration !== 'object') {
			throw new error.NoConfiguration('No config passsed to Server object.');
        }   
        
        this.configuration = opts.configuration;
        this.lagan = opts.lagan;
        this.log = opts.log;

        this.command = [];
        this.query = [];
    
        this._resolvers = {
            Command: {
                log: (obj, { level, msg }, context, info) => this.log && this.log[level.toLowerCase()](msg, { ip: context.ip, reqId: context.reqId, source: 'graphql' })
            },
            Query: {
                serverName: () => this.configuration.name,
                serverVersion: () => this.configuration.version,
                mySessionKeyId: (obj, {}, context, info) => context.sessionKeyId
            }
        };
        
        this._typeDefs = [
            `
                schema {
                    mutation: Command
                    query: Query
                }
            `,
            `
                enum LogLevel {
                    ERROR
                    WARN
                    INFO
                    VERBOSE
                    DEBUG
                    SILLY
                }
            `,
            `
                type Command {
                    log(level: LogLevel, msg: String!): Boolean
                }
            `,
            `
                type Query {
                    serverName: String!
                    serverVersion: String!
                    mySessionKeyId: String!
                }
            `,
            `
                type EventStreamPosition {
                    position: Int!
                }
            `
        ];

    }

    addTypeDefs(defs) {
        defs.forEach(def => this._typeDefs.push(def));
    }
    
    addResolver(type, field, fn) {
        if (typeof this._resolvers[type] === 'undefined') {
            this._resolvers[type] = {};
        }
        this._resolvers[type][field] = fn;
    }
    
    createCommand(commandName, EventClass, response) {
        this.lagan.registerEvent(EventClass); // TODO: Check for dupes. RegisterEvent might throw an error here..
        this.log.debug('New command created.', { commandName, eventName: new EventClass({}).type });
        const commandFn = function(props, scope) {
            let obj, context, info;
            if (scope && scope.obj) obj = scope.obj;
            if (scope && scope.context) context = scope.context;
            if (scope && scope.info) info = scope.info;
            return new (EventClass)(props).apply(context)
                .then(({ state, position, props }) => {
                    if (typeof response === 'function') {
                        return response(props, { obj, context, info, state, position })
                    }
                    return { position };
                });
        }
        const fields = EventClass.propsDefinition();
        const returnType = (response && response._evileye && response._evileye.graphQlReturnType) || 'EventStreamPosition';
        const typeDefArgs = Object.keys(fields).length === 0 ? '' : '(' + Object.keys(fields).map(key => '  ' + key + ': ' + fields[key]).join('\n') + ')';
        const typeDef = 'extend type Command {\n' + commandName + ' ' + typeDefArgs + ': ' + returnType + '}';
        this.log.silly('New graphql definition.', { typeDef: typeDef });
        this.addTypeDefs([ typeDef ]);
        this.addResolver('Command', commandName, (obj, props, context, info) => commandFn(props, { obj, context, info }));
        this.command[commandName] = commandFn;
        return commandFn;
    }

    createQuery(queryName, propsDefinition, queryFn, returnType) {
        const resolverFn = (props, scope) => {
            let obj, context, info, state, position;
            if (scope && scope.obj) obj = scope.obj;
            if (scope && scope.context) context = scope.context;
            if (scope && scope.info) info = scope.info;
            if (scope && scope.state) state = scope.state;
            if (scope && scope.position) position = scope.position;
            if (global.evilEyeTestTools && !context && evilEyeTestTools.session.keyId) {
                return new Promise((resolve, reject) => {
                    const keyId = evilEyeTestTools.session.keyId;
                    evilEyeTestTools.authFn(keyId, (err, secretKey) => {
                        if (err) return reject(err);
                        resolve({ keyId, secretKey });
                    })
                })
                    .then(({ keyId, secretKey }) => {
                        if (!secretKey) throw new Error('No such key.');
                        if (secretKey !== evilEyeTestTools.session.secretKey) {
                            throw new Error('Hash does not match.');
                        }
                        return queryFn(props, {
                            obj,
                            context: { sessionKeyId: keyId },
                            info,
                            state: typeof state !== 'undefined' ? state : this.lagan.state,
                            position
                        });
                    });
            }
            return queryFn(props, {
                obj,
                context,
                info,
                state: typeof state !== 'undefined' ? state : this.lagan.state,
                position
            });
        }

        resolverFn._evileye = { graphQlReturnType: returnType };
        const typeDefArgs = Object.keys(propsDefinition).length === 0 ? '' : '(' + Object.keys(propsDefinition).map(key => '  ' + key + ': ' + propsDefinition[key]).join('\n') + ')';
        const typeDef = 'extend type Query {\n' + queryName + ' ' + typeDefArgs + ': ' + returnType + '}';
        this.log.silly('New graphql definition.', { typeDef: typeDef });
        this.addTypeDefs([ typeDef ]);
        this.addResolver('Query', queryName, (obj, props, context, info) => resolverFn(props, { obj, context, info, state: this.lagan.state, position: this.lagan.position }));
        this.query[queryName] = resolverFn;
        return resolverFn;
    }

    middleware() {
        const options = {
            schema: makeExecutableSchema({
                typeDefs: this._typeDefs,
                resolvers: this._resolvers
            }),
            rootValue: {},
            graphiql: false,
            formatError: error => {
                this.log.error(this.log.messages.graphqlError, {
                    errorMessage: error.message,
                    locations: error.locations,
                    stack: error.stack ? error.stack.split('\n') : [],
                    path: error.path
                  });
                return formatError(error);
            }
        };
        return expressGraphql(options);
    }

}

module.exports = GraphQL;
