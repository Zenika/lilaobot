describe('functions_helloworld_http', () => {

  const assert = require('assert');
  const sinon = require('sinon');
  const { oauth2init } = require('..');
  const oauthLibrary = require('../lib/oauth');

  it('helloHttp: should print a name', async () => {
    // mock dependencies
    sinon.stub(oauthLibrary, "getOAuth2Client").returns(
      {
        generateAuthUrl : function() {
          return "some-url"
        }
      }
    );

    // Mock ExpressJS 'req' and 'res' parameters
    const req = {
      query: {},
      body: {
      },
    };
    const res = { redirect: sinon.stub() };

    // Call tested function
    await oauth2init(req, res);

    // Verify behavior of tested function
    assert.ok(res.redirect.calledOnce);
    assert.deepStrictEqual(res.redirect.firstCall.args, [`some-url`]);
  });
});