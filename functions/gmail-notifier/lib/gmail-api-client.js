/**
 * Copyright 2018, Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const { google } = require('googleapis')
const gmail = google.gmail('v1')
const config = require('../config')

/**
 * Helper function to get the current user's email address
 */
exports.getEmailAddress = async (oauth2Client) => {
  return gmail.users
    .getProfile({
      auth: oauth2Client,
      userId: 'me',
    })
    .then((res) => res.data.emailAddress)
}

/**
 * Helper function to trigger a watch on a gmail inbox,
 * this is a feature from gmail, it will forward incoming mails to the Pub/Sub topic
 */
exports.watchGmailInbox = async (oauth2Client) => {
  return gmail.users.watch({
    auth: oauth2Client,
    userId: 'me',
    resource: {
      labelIds: ['INBOX'],
      topicName: config.TOPIC_NAME,
    },
  })
}

/**
 * List GMail message IDs
 * doc: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
 * @returns A promise containing a list of GMail message IDs
 */
exports.listMessages = async (oauth2Client) => {
  return gmail.users.messages.list({ auth: oauth2Client, userId: 'me' })
}

/**
 * Get a GMail message given a message ID
 * @param messageId The ID of the message to get
 * @returns A promise containing the specified GMail message
 */
exports.getMessageById = (oauth2Client, messageId) => {
  return gmail.users.messages.get({
    auth: oauth2Client,
    id: messageId,
    userId: 'me',
  })
}
