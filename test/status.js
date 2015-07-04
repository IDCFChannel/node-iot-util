var request    = require('request'),
    sinon      = require('sinon'),
    should = require('chai').should,
    status = require('../commands/statusCommand');

describe('status command', function() {
    before(function(done){
        sinon.stub(request, 'get')
            .yields(null, {statusCode: 200}, JSON.stringify({meshblu:'online'}));
        done()
    });

    after(function(done){
        request.get.restore();
        done();
    });

    it('should show meshblu status', function(done) {
        status._status(function(err, res){
            request.get.called.should.equal(true);
            var off = '\u001b[39m'
              , red = '\u001b[31m'
              , orange = '\u001b[38;5;221m'
              , grey = '\u001b[90m';
            var expected = [
              grey + '┌─────────┐' + off
            , grey + '│' + off + red + ' meshblu ' + off + grey + '│' + off
            , grey + '├─────────┤' + off
            , grey + '│' + off + ' online  ' + grey + '│' + off
            , grey + '└─────────┘' + off
            ];
            res.should.equal(expected.join('\n'));
            done();
        });
    });
});
