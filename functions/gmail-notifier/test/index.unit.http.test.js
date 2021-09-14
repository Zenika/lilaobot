describe('test gmail-notifier functions', () => {

  const assert = require('assert');
  const sinon = require('sinon');
  const { oauth2init, oauth2callback } = require('..');
  const oauthLibrary = require('../lib/oauth');

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
      sandbox.restore();
  });

  it('oauth2init: should redirect to Google connect id page', async () => {
    // mock dependencies
    sandbox.stub(oauthLibrary, "getOAuth2Client").returns(
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

  it('oauth2callback: should redirect to initWatch', async () => {
    // mock dependencies
    sandbox.stub(oauthLibrary, "saveToken");
    sandbox.stub(oauthLibrary, "getOAuth2Client").returns(
      {
        some: "dummy client",
        getToken : function(code, callback) {
          return {some: "dummy token"}
        }
      }
    );
    sandbox.stub(oauthLibrary, "getEmailAddress").returns(
      "some-email@address.com"
    );

    // Mock ExpressJS 'req' and 'res' parameters
    const req = {
      query: { code: 'some-code' },
      body: {
      },
    };
    const res = { redirect: sinon.stub() };

    // Call tested function
    await oauth2callback(req, res);

    // Verify behavior of tested function
    assert.ok(res.redirect.calledOnce);
    assert.match(res.redirect.firstCall.args[0], /initWatch/);
  });
});