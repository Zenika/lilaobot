describe('test gmail-api-client', () => {
  const assert = require('assert')
  const sinon = require('sinon')
  const proxyquire = require('proxyquire')

  // test data
  const gmailMessage = require('./gmail-message-response.json')
  const oauth2Client = {
    some: 'dummy client',

    //eslint-disable-next-line no-unused-vars
    getToken: function (code, callback) {
      return { some: 'dummy token' }
    },
    //eslint-disable-next-line no-unused-vars
    setCredentials: function (param) {},
  }
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const getGmailAPIClient = (mock) => {
    return proxyquire('../lib/gmail-api-client', {
      googleapis: {
        google: {
          gmail: () => mock,
        },
      },
    })
  }

  it('listMessages: should get messages from gmail and return ids', async () => {
    // given
    const gmailAPIClient = getGmailAPIClient({
      users: {
        history: {
          list: function () {
            return {
              data: {
                messages: [gmailMessage],
                nextPageToken: undefined,
                resultSizeEstimate: 1,
              },
            }
          },
        },
      },
    })

    // when
    const result = await gmailAPIClient.listMessages(oauth2Client)

    // then
    assert.equal(result[0].id, ['1234'])
  })

  it('getMessageById: should get a message by id', async () => {
    // then
    const gmailAPIClient = getGmailAPIClient({
      users: {
        messages: {
          get: () => gmailMessage,
        },
      },
    })

    // when
    const result = await gmailAPIClient.getMessageById(oauth2Client)

    // then
    assert.equal(result.id, '1234')
  })
})
