// Retrieves all the Environment Variables (See main.tf to know their values)
const GCF_REGION = process.env.FUNCTION_REGION
const GCLOUD_PROJECT = process.env.GCP_PROJECT
const TOPIC_ID = process.env.TOPIC_ID

// Computed values
exports.GCF_BASE_URL = `https://${GCF_REGION}-${GCLOUD_PROJECT}.cloudfunctions.net`
exports.TOPIC_NAME = `projects/${GCLOUD_PROJECT}/topics/${TOPIC_ID}`
exports.GCF_REGION = GCF_REGION
exports.GCLOUD_PROJECT = GCLOUD_PROJECT

// Constants
exports.NO_LABEL_MATCH = "Message doesn't match label"
exports.UNKNOWN_USER_MESSAGE = 'Uninitialized email address'
