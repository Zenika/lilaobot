describe('test gmail-notifier functions', () => {
  const assert = require('assert')
  const sinon = require('sinon')
  const { oauth2init, oauth2callback, initWatch, onNewMessage } = require('..')
  const oauthLibrary = require('../lib/oauth')
  const gmailAPIClient = require('../lib/gmail-api-client')

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('oauth2init: should redirect to Google connect id page', async () => {
    // mock dependencies
    sandbox.stub(oauthLibrary, 'getOAuth2Client').returns({
      generateAuthUrl: function () {
        return 'some-url'
      }
    })

    // Mock ExpressJS 'req' and 'res' parameters
    const req = {
      query: {},
      body: {}
    }
    const res = { redirect: sinon.stub() }

    // Call tested function
    await oauth2init(req, res)

    // Verify behavior of tested function
    assert.ok(res.redirect.calledOnce)
    assert.deepStrictEqual(res.redirect.firstCall.args, ['some-url'])
  })

  it('oauth2callback: should redirect to initWatch', async () => {
    // mock dependencies
    sandbox.stub(oauthLibrary, 'saveToken')
    sandbox.stub(oauthLibrary, 'getOAuth2Client').returns({
      some: 'dummy client',
      getToken: function (code, callback) {
        return { some: 'dummy token' }
      },
      setCredentials: function (param) {}
    })
    sandbox
      .stub(gmailAPIClient, 'getEmailAddress')
      .returns('some-email@address.com')

    // Mock ExpressJS 'req' and 'res' parameters
    const req = {
      query: { code: 'some-code' },
      body: {}
    }
    const res = { redirect: sinon.stub() }

    // Call tested function
    await oauth2callback(req, res)

    // Verify behavior of tested function
    assert.ok(res.redirect.calledOnce)
    assert.match(res.redirect.firstCall.args[0], /initWatch/)
  })

  it('initWatch: should init watch on gmail inbox', async () => {
    // mock dependencies
    sandbox.stub(oauthLibrary, 'fetchToken')
    sandbox.stub(gmailAPIClient, 'watchGmailInbox')

    // Mock ExpressJS 'req' and 'res' parameters
    const req = {
      query: { emailAddress: 'some-email@address.com' }
    }
    const res = { send: sinon.stub() }

    // Call tested function
    await initWatch(req, res)

    // Verify behavior of tested function
    assert.ok(res.send.calledOnce)
    assert.match(res.send.firstCall.args[0], /Watch initialized/)
    assert.match(res.send.firstCall.args[0], /some-email@address.com/)
  })

  it('onNewMessage: should received message from Pub/sub and retreive email content', async () => {
    // given
    sandbox.stub(oauthLibrary, 'fetchToken').returns(Promise.resolve())
    sandbox.stub(gmailAPIClient, 'listMessages').returns({ messages: [{ id: '1234' }] })
    const gmailMessage = require('./gmail-message-response.json')
    sandbox.stub(gmailAPIClient, 'getMessageById').returns(gmailMessage)

    const message = {
      // from https://developers.google.com/gmail/api/guides/push#watch_response
      // This is the actual notification data, as base64url-encoded JSON.
      data: 'eyJlbWFpbEFkZHJlc3MiOiAidXNlckBleGFtcGxlLmNvbSIsICJoaXN0b3J5SWQiOiAiMTIzNDU2Nzg5MCJ9',
      // This is a Cloud Pub/Sub message id, unrelated to Gmail messages.
      messageId: '2070443601311540',
      // This is the publish time of the message.
      publishTime: '2021-02-26T19:13:55.749Z'
    }

    // when
    const result = await onNewMessage(message)

    // then
    assert.match(result.payload.body.data, /some data/)
  })
})
