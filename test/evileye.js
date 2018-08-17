const EvilEye = require('../src/evileye');
const expect = require('chai').expect;

describe('EvilEye', () => {

    it('should not expose any private properties', () => {
        const evilEye = new EvilEye();
        Object.keys(evilEye).forEach(prop => {
            expect(prop.substr(0, 1)).to.not.equal('_');
        })
        evilEye.close();
    })

})
