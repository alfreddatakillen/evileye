const Configuration = require('../src/configuration');
const disposableFile = require('disposableFile');
const envcnf = require('envcnf');
const expect = require('chai').expect;
const path = require('path');
const td = require('testdouble');

describe('Configuration', () => {

    describe('.basedir', () => {

        it('can be overridded by opts', () => {
            return disposableFile.dir()
                .then(dir => {
                    const configuration = new Configuration({ basedir: dir });
                    expect(configuration.basedir).to.equal(dir);
                });
        });

        it('should be the root of the project', () => {
            const configuration = new Configuration();
            expect(configuration.basedir).to.equal(path.resolve(__dirname + '/..'));
        })

    });

    describe('.eventLogFile', () => {

        it('should be a string', () => {
            const configuration = new Configuration();
            expect(configuration.eventLogFile).to.be.a('string');
        })
    })

    describe('.logFile', () => {

        it('should be a string', () => {
            const configuration = new Configuration();
            expect(configuration.logFile).to.be.a('string');
        })
    })

    describe('.logLevel', () => {

        afterEach(() => td.reset());

        it('should be "silly" if not specified', () => {
            td.replace(envcnf, 'env');
            td.when(envcnf.env()).thenReturn({
                // No environment at all.
            });
            
            const configuration = new Configuration(); // No options
            expect(configuration.logLevel).to.equal('silly');
        })

        it('should be set by LOG_LEVEL environment variable', () => {
            td.replace(envcnf, 'env');
            td.when(envcnf.env()).thenReturn({
                LOG_LEVEL: 'verbose'
            });
            
            const configuration = new Configuration();
            expect(configuration.logLevel).to.equal('verbose');
        });

        it('should be overridden by opts', () => {
            td.replace(envcnf, 'env');
            td.when(envcnf.env()).thenReturn({
                LOG_LEVEL: 'verbose'
            });
            
            const configuration = new Configuration({ logLevel: 'debug' });
            expect(configuration.logLevel).to.equal('debug');
        });

    });

    describe('.name', () => {

        it('should be "unknown" if there is no package.json', () => {
            return disposableFile.dir()
                .then(dir => {
                    const configuration = new Configuration({ basedir: dir });
                    expect(configuration.name).to.equal('unknown');
                });
        });

        it('should be "evileye" during tests', () => {
            const configuration = new Configuration();
            expect(configuration.name).to.equal('evileye');
        })

    });

    describe('.port', () => {

        afterEach(() => td.reset());

        it('should be 80 in production stage', () => {
            const configuration = new Configuration({ stage: 'production' });
            expect(configuration.port).to.equal(80);

        });

        it('should be null in development stage, if nothing was specified', () => {
            const configuration = new Configuration({ stage: 'development' });
            expect(configuration.port).to.be.a('null');
        });

    });

    describe('.slackWebhook', () => {

        afterEach(() => td.reset());

        it('should be empty string if not specified', () => {
            td.replace(envcnf, 'env');
            td.when(envcnf.env()).thenReturn({
                // No environment at all.
            });
            
            const configuration = new Configuration(); // No options
            expect(configuration.slackWebhook).to.equal('');
        });

        it('should be set by environment variable', () => {
            td.replace(envcnf, 'env');
            td.when(envcnf.env()).thenReturn({
                SLACK_WEBHOOK_URL: 'http://example.org/slack'
            });
            
            const configuration = new Configuration(); // No options
            expect(configuration.slackWebhook).to.equal('http://example.org/slack');
        });

        it('can be overridden by opts', () => {
            td.replace(envcnf, 'env');
            td.when(envcnf.env()).thenReturn({
                SLACK_WEBHOOK_URL: 'http://example.org/slack'
            });
            
            const configuration = new Configuration({ slackWebhook: 'https://example.com/webhook' }); // No options
            expect(configuration.slackWebhook).to.equal('https://example.com/webhook');
        });

    });

    describe('.stage', () => {

        afterEach(() => td.reset());

        it('should be "test" when running tests', () => {
            const configuration = new Configuration();
            expect(configuration.stage).to.equal('test');
        })

        it('should default to "development" if nothing was specified', () => {

            td.replace(envcnf, 'env');
            td.when(envcnf.env()).thenReturn({
                // No environment at all.
            });
            
            const configuration = new Configuration(); // No options

            expect(configuration.stage).to.equal('development');

        });

        it('can be overridded by opts', () => {
            td.replace(envcnf, 'env');
            td.when(envcnf.env()).thenReturn({
                'NODE_ENV': 'production'
            });

            const configuration = new Configuration({ stage: 'qa' });
            expect(configuration.stage).to.equal('qa');
        });
    });

    describe('.version', () => {

        it('should be "0.0.1" if there is no package.json', () => {
            return disposableFile.dir()
                .then(dir => {
                    const configuration = new Configuration({ basedir: dir });
                    expect(configuration.version).to.equal('0.0.1');
                });
        }); 

    });


});