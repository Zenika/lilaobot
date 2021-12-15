'use strict'

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
const secretManagerServiceClient = new SecretManagerServiceClient()

exports.get = async (secretName) => {
  const request = { name: `projects/${config.GCLOUD_PROJECT}/secrets/${secretName}/versions/latest` }
  let response
  try {
    response = await secretManagerServiceClient.accessSecretVersion(request)
  } catch (e) {
    console.error('Could not access project secret, error: ' + e)
    throw e
  }
  return response[0].payload.data.toString('utf8')
}
