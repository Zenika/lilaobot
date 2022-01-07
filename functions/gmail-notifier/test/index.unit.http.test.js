const assert = require('assert')
const sinon = require('sinon')
const { oauth2init, oauth2callback, initWatch, onNewMessage } = require('..')
const oauthLibrary = require('../lib/oauth')
const gmailAPIClient = require('../lib/gmail-api-client')
const slackClient = require('../lib/slack-client')
let sandbox;

function setupInitWatch(query) {
  // mock dependencies
  sandbox.stub(oauthLibrary, 'fetchToken')
  sandbox.stub(gmailAPIClient, 'watchGmailInbox')

  // Mock ExpressJS 'req' and 'res' parameters
  const req = { query }
  const res = {
    send: sinon.stub(),
    status: sinon.stub().returns({ send: sinon.stub() }),
  }

  return { req, res }
}

describe('test gmail-notifier functions', () => {
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
      },
    })

    // Mock ExpressJS 'req' and 'res' parameters
    const req = {
      query: {},
      body: {},
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
    //eslint-disable-next-line no-unused-vars
      getToken: function (code, callback) {
        return { some: 'dummy token' }
      },
    //eslint-disable-next-line no-unused-vars
      setCredentials: function (param) {},
    })
    sandbox
      .stub(gmailAPIClient, 'getEmailAddress')
      .returns('some-email@address.com')

    // Mock ExpressJS 'req' and 'res' parameters
    const req = {
      query: { code: 'some-code' },
      body: {},
    }
    const res = { redirect: sinon.stub() }

    // Call tested function
    await oauth2callback(req, res)

    // Verify behavior of tested function
    assert.ok(res.redirect.calledOnce)
    assert.match(res.redirect.firstCall.args[0], /initWatch/)
  })

  it('initWatch: should init watch on gmail inbox', async () => {
    const { req, res } = setupInitWatch({
      emailAddress: 'some-email@address.com',
    })

    // Call tested function
    await initWatch(req, res)

    // Verify behavior of tested function
    assert.ok(res.send.calledOnce)
    assert.match(res.send.firstCall.args[0], /Watch initialized/)
    assert.match(res.send.firstCall.args[0], /some-email@address.com/)
  })

  it('initWatch: should return error 400 if no email address is specified', async () => {
    const { req, res } = setupInitWatch({
      NoemailAddress: 'some-email@address.com',
    })

    // Call tested function
    await initWatch(req, res)

    // Verify behavior of tested function
    assert.ok(res.status.calledOnce)
    assert.ok(res.status().send.calledOnce)
    assert.equal(res.status.firstCall.args[0], 400)
    assert.match(
      res.status().send.firstCall.args[0],
      /No emailAddress specified./
    )
  })

  it('initWatch: should return error 400 if a bad address is specified', async () => {
    const { req, res } = setupInitWatch({
      emailAddress: 'some-emailaddress.com',
    })

    // Call tested function
    await initWatch(req, res)

    // Verify behavior of tested function
    assert.ok(res.status.calledOnce)
    assert.ok(res.status().send.calledOnce)
    assert.equal(res.status.firstCall.args[0], 400)
    assert.match(res.status().send.firstCall.args[0], /Invalid emailAddress/)
  })

  it('onNewMessage: should received message from Pub/sub and retreive email content', async () => {
    // given
    sandbox.stub(oauthLibrary, 'fetchToken').returns(Promise.resolve())
    sandbox
      .stub(gmailAPIClient, 'listMessages')
      .returns(Promise.resolve({ data: { messages: [{ id: '1234' }] } }))
    const gmailMessage = require('./gmail-message-response.json')
    sandbox
      .stub(gmailAPIClient, 'getMessageById')
      .returns({ data: gmailMessage })
    const slackClientSpy = sandbox.stub(slackClient, 'postMessageToSlack').returns(Promise.resolve())

    const message = {
      // from https://developers.google.com/gmail/api/guides/push#watch_response
      // This is the actual notification data, as base64url-encoded JSON.
      data: 'eyJlbWFpbEFkZHJlc3MiOiAidXNlckBleGFtcGxlLmNvbSIsICJoaXN0b3J5SWQiOiAiMTIzNDU2Nzg5MCJ9',
      // This is a Cloud Pub/Sub message id, unrelated to Gmail messages.
      messageId: '2070443601311540',
      // This is the publish time of the message.
      publishTime: '2021-02-26T19:13:55.749Z',
    }

    // when
    const result = await onNewMessage(message)

    // then
    assert.match(result.length, /some data/)
    sandbox.assert.called(slackClientSpy);
  })
})
