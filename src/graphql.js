const configuration = require('./configuration');
const error = require('./error');
const expressGraphql = require('express-graphql');
const { makeExecutableSchema } = require('graphql-tools');

class GraphQL {

    constructor(opts) {
        if (typeof opts !== 'object' || typeof opts.configuration !== 'object') {
			throw new error.NoConfiguration('No config passsed to Server object.');
        }   
        
        this.configuration = opts.configuration;
        this.lagan = opts.lagan;
        this.log = opts.log;
    
        this._resolvers = {
            Command: {
                log: (obj, { level, msg }, context, info) => this.log && this.log[level.toLowerCase()](msg, { ip: context.ip, reqId: context.reqId, source: 'graphql' })
            },
            Query: {
                serverName: () => this.configuration.name,
                serverVersion: () => this.configuration.version,
                whoAmI: (obj, {}, context, info) => context.user
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
                    whoAmI: String!
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
        const commandFn = function(props, { obj, context, info }) {
            return new (EventClass)(props).apply()
                .then(({ state, position }) => {
                    if (typeof response === 'function') {
                        return response(props, { obj, context, info, state, position })
                    }
                    return true;
                });
        }
        const fields = EventClass.propsDefinition();
        const returnType = (response && response._evileye && response._evileye.graphQlReturnType) || 'Boolean';
        const typeDefArgs = fields.length === 0 ? '' : '(' + Object.keys(fields).map(key => '  ' + key + ': ' + fields[key]).join('\n') + ')';
        const typeDef = 'extend type Command {\n' + commandName + ' ' + typeDefArgs + ': ' + returnType + '}';
        this.log.silly('New graphql definition.', { typeDef: typeDef });
        this.addTypeDefs([ typeDef ]);
        this.addResolver('Command', commandName, (obj, props, context, info) => commandFn(props, { obj, context, info }));
        return commandFn;
    }

    createQuery(queryName, propsDefinition, queryFn, returnType) {
        const resolverFn = function(props, { obj, context, info, state, position }) {
            return queryFn(props, {
                obj,
                context,
                info,
                state: typeof state !== 'undefined' ? state : this.state,
                position
            });
        }
        resolverFn._evileye = { graphQlReturnType: returnType };
        const typeDefArgs = propsDefinition.length === 0 ? '' : '(' + Object.keys(propsDefinition).map(key => '  ' + key + ': ' + propsDefinition[key]).join('\n') + ')';
        const typeDef = 'extend type Query {\n' + queryName + ' ' + typeDefArgs + ': ' + returnType + '}';
        this.log.silly('New graphql definition.', { typeDef: typeDef });
        this.addTypeDefs([ typeDef ]);
        this.addResolver('Query', queryName, (obj, props, context, info) => resolverFn(props));
        return resolverFn;
    }

    middleware() {
        return expressGraphql({
            schema: makeExecutableSchema({
                typeDefs: this._typeDefs,
                resolvers: this._resolvers
            }),
            rootValue: {},
            graphiql: false
        })
    }

}

module.exports = GraphQL;