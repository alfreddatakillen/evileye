const Configuration = require('../src/configuration');
const expect = require('chai').expect;
const Log = require('../src/log');

describe('Log', () => {

    describe('levels', () => {

        let log;
        
        before(() => log = new Log({ configuration: new Configuration() }));

        it('should have .error function', () => {
            expect(log.error).to.be.a('function');
        })
    
        it('should have .warn function', () => {
            expect(log.warn).to.be.a('function');
        })
    
        it('should have .info function', () => {
            expect(log.info).to.be.a('function');
        })
    
        it('should have .verbose function', () => {
            expect(log.verbose).to.be.a('function');
        })
    
        it('should have .debug function', () => {
            expect(log.debug).to.be.a('function');
        })
    
        it('should have .silly function', () => {
            expect(log.silly).to.be.a('function');
        })
    
    
    });

});