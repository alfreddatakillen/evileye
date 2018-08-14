const Configuration = require('../src/configuration');
const error = require('../src/error');
const expect = require('chai').expect;
const GraphQL = require('../src/graphql');
const Lagan = require('lagan');
const Log = require('../src/log');
const request = require('supertest');
const Server = require('../src/server');
const sessionistHeader = require('sessionistheader');

describe('Server', () => {

    it('needs configuration', () => {
        expect(() => new Server()).to.throw(error.NoConfiguration);
    });

    it("should store configuration object in it's properties", () => {
        const configuration = new Configuration();
        const server = new Server({ configuration });
        expect(server.configuration).to.equal(configuration);
    });

    describe('port selector', () => {

        let server0, server1, server2, lagan;

        after(() => {
            server0.close();
            server1.close();
            server2.close();
            lagan.close();
        });

        it('should pick different ports if multiple server insances are listening', () => {
            const configuration = new Configuration();
            lagan = new Lagan();
            const graphql = new GraphQL({ configuration, lagan });
            server0 = new Server({ configuration, graphql });
            return server0.listen()
                .then(port0 => {
                    server1 = new Server({ configuration, graphql });
                    return server1.listen()
                        .then(port1 => {
                            server2 = new Server({ configuration, graphql });
                            return server2.listen()
                            .then(port2 => {
                                expect(port0).to.not.equal(port1);
                                expect(port1).to.not.equal(port2);
                                expect(port0).to.not.equal(port2);
                            })
                        })
                });
        });
    
    });

    describe('authentication', () => {

        describe('without authorization header', () => {

            let lagan, server;

            after(() => {
                server.close();
                lagan.close();
            })

            it('should set user to empty string', () => {

                const configuration = new Configuration();
                lagan = new Lagan();
                const graphql = new GraphQL({ configuration, lagan });
                server = new Server({ configuration, graphql });
                return server.listen()
                    .then(() => {
                        return request(server.app)
                            .post('/graphql')
                            .send('{ "query": "query { whoAmI }" }')
                            .expect(200)
                            .then(res => {
                                expect(res.body).to.deep.equal({ data: { whoAmI: '' } });
                            });
                    });
    
            })
    
        });

        describe('with wrong user credentials', () => {

            let lagan, server;

            after(() => {
                server.close();
                lagan.close();
            })

            it('should set user empty string', () => {

                const configuration = new Configuration();
                lagan = new Lagan();
                const log = new Log({ configuration });
                const graphql = new GraphQL({ configuration, lagan, log });
                const auth = ({ user }) => {
                    if (user === 'johndoe') return 'topsecret';
                    throw new Error('No such user.');
                };
                server = new Server({ auth, configuration, graphql, lagan, log });

                const keyId = 'johndoe';
                const secretKey = 'wrong secret key';
                const url = '/graphql';
                const method = 'POST';
                const body = '{ "query": "query { whoAmI }" }';
                const date = new Date().toISOString();

                return server.listen()
                    .then(() => sessionistHeader(keyId, secretKey, method, url, body, date))
                    .then(header => {
                        return request(server.app)
                            .post(url)
                            .set({
                                Authorization: header,
                                Date: date
                            })
                            .send(body)
                            .expect(200)
                            .then(res => {
                                expect(res.body).to.deep.equal({ data: { whoAmI: '' } });
                            });
                    });
    
            })
    
        });


        describe('with valid authorization header', () => {

            let lagan, server;

            after(() => {
                server.close();
                lagan.close();
            })

            it('should set user to the auth header key id', () => {

                const configuration = new Configuration();
                lagan = new Lagan();
                const log = new Log({ configuration });
                const graphql = new GraphQL({ configuration, lagan, log });
                const auth = ({ user }) => {
                    if (user === 'johndoe') return 'topsecret';
                    throw new Error('No such user.');
                };
                server = new Server({ auth, configuration, graphql, lagan, log });

                const keyId = 'johndoe';
                const secretKey = 'topsecret';
                const url = '/graphql';
                const method = 'POST';
                const body = '{ "query": "query { whoAmI }" }';
                const date = new Date().toISOString();

                return server.listen()
                    .then(() => sessionistHeader(keyId, secretKey, method, url, body, date))
                    .then(header => {
                        return request(server.app)
                            .post(url)
                            .set({
                                Authorization: header,
                                Date: date
                            })
                            .send(body)
                            .expect(200)
                            .then(res => {
                                expect(res.body).to.deep.equal({ data: { whoAmI: keyId } });
                            });
                    });
    
            })
    
        });

    });
 
});