const { useFakeServer } = require('sinon')

describe('test gmail-api-client', () => {
  const assert = require('assert')
  const sinon = require('sinon')
  const proxyquire = require('proxyquire')

  // test data
  const gmailMessage = require('./gmail-message-response.json')
  const oauth2Client = {
    some: 'dummy client',
    getToken: function (code, callback) {
      return { some: 'dummy token' }
    },
    setCredentials: function (param) {}
  }

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
          gmail: () => mock
        }
      }
    })
  }

  it('listMessages: should get messages from gmail and return ids', async () => {
    // given
    const gmailAPIClient = getGmailAPIClient({
      users: {
        messages: {
          list: function () {
            return {
              messages: [gmailMessage],
              nextPageToken: 'string',
              resultSizeEstimate: 1
            }
          }
        }
      }
    })

    // when
    const result = await gmailAPIClient.listMessages(oauth2Client)

    // then
    assert.equal(result.messages[0].id, ['1234'])
  })

  it('getMessageById: should get a message by id', async () => {
    // then
    const gmailAPIClient = getGmailAPIClient({
      users: {
        messages: {
          get: () => gmailMessage
        }
      }
    })

    // when
    const result = await gmailAPIClient.getMessageById(oauth2Client)

    // then
    assert.equal(result.id, '1234')
  })
})
