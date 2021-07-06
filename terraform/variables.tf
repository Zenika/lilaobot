variable "gcp_project" {}

variable "gcp_credentials" {}

variable "gcp_region" {
  default = "europe-west1"
}

variable "gcp_zone" {
  default = "europe-west1-b"
}

variable "slack_callForOffer_topic_name" {}
variable "slack_publish_function_entrypoint" {}

variable "slack_publisher_bucket_archive_filepath" {
  default = "slack_publisher_function_content.zip"
}

variable "oauth2_init_function_entrypoint" {}
variable "oauth2_callback_function_entrypoint" {}

variable "gmail_initWatch_function_entrypoint" {}
variable "gmail_onNewMessage_function_entrypoint" {}
variable "gmail_onNewMessage_topic_name" {}

variable "gmail_notifier_bucket_archive_filepath" {
  default = "gmail_notifier_function_content.zip"
}