const expect = require('chai').expect;
const EvilEye = require('../src/evileye');
const supertest = require('supertest');

describe('GraphQL', () => {

    describe('createCommand', () => {

        describe('with query function as response', () => {

            let evilEye;

            beforeEach(() => evilEye = new EvilEye());
            afterEach(() => evilEye.close());

            it('should resolve data from the query', () => {

                class UserAdded extends evilEye.Event {
                    static propsDefinition() {
                        return {
                            'username': 'String!'
                        };
                    }
                    validate() {}
                    project({ state }) {
                        const newState = { ...state, users: [ ...(state.users || []), { username: this.props.username, city: 'Bagarmossen' } ]};
                        return newState;
                    }
                }

                const getLastUser = evilEye.createQuery(
                    'getLastUser',
                    {},
                    ({ username }, { obj, context, info, state }) => {
                        const nrOfUsers = (state.users && state.users.length) || 0;
                        if (!nrOfUsers) throw new Error('No users in db.');
                        return state.users[nrOfUsers - 1];
                    },
                    'User'
                );

                evilEye.addTypeDefs([
                    `
                        type User {
                            username: String!
                            city: String!
                        }
                    `
                ]);

                const addUser = evilEye.createCommand('addUser', UserAdded, getLastUser);

                return evilEye.listen()
                    .then(port => {
                        const request = supertest('http://localhost:' + port);
                        return request
                            .post('/graphql')
                                .send('{ "query": "mutation { addUser(username:\\"alfred\\") { username city } }" }')
                                .then(res => {
                                    expect(res.body).to.deep.equal({ data: { addUser: { city: 'Bagarmossen', username: 'alfred' } } });
                                });
                    });

            });

            it('can pass on new arguments to the query', () => {

                class UserAdded extends evilEye.Event {
                    static propsDefinition() {
                        return {
                            'username': 'String!'
                        };
                    }
                    validate() {}
                    project({ state }) {
                        const id = Math.floor(Math.random() * 1000000000);
                        const newState = { ...state, users: [ ...(state.users || []), { id, username: this.props.username } ]};
                        this.props.id = id; // Just as the other props, this will be passed on as argument to the query resolver.
                        return newState;
                    }
                }

                const getUserById = evilEye.createQuery(
                    'getUserById',
                    { 'id': 'ID!' },
                    ({ id }, { obj, context, info, state }) => {
                        const users = (state.users || []).filter(user => user.id === id);
                        if (users.length === 0) throw new Error('No such user.');
                        return users[0];
                    },
                    'User'
                );

                evilEye.addTypeDefs([
                    `
                        type User {
                            id: ID!
                            username: String!
                        }
                    `
                ]);

                const addUser = evilEye.createCommand('addUser', UserAdded, getUserById);

                return evilEye.listen()
                    .then(port => {
                        const request = supertest('http://localhost:' + port);
                        return request
                            .post('/graphql')
                                .send('{ "query": "mutation { addUser(username:\\"alfred\\") { id username } }" }')
                                .then(res => {
                                    expect(res.body.data.addUser.id).to.match(/^[0-9]+$/);
                                    expect(res.body.data.addUser.username).to.equal('alfred');
                                });
                    });

            });


        });

    });

});