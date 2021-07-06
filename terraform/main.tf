resource "google_pubsub_topic" "slack_callForOffer_topic" {
  name = var.slack_callForOffer_topic_name
}

resource "google_pubsub_topic" "gmail_onNewMessage_topic" {
  name = var.gmail_onNewMessage_topic_name
}

resource "google_storage_bucket" "functions_bucket" {
  name          = "lilaobot-functions-storage"
  force_destroy = true
}

data "archive_file" "slack_publisher_archive" {
  type        = "zip"
  source_dir  = "../functions/slack-publisher"
  output_path = var.slack_publisher_bucket_archive_filepath
}

data "archive_file" "gmail_notifier_archive" {
  type        = "zip"
  source_dir  = "../functions/gmail-notifier"
  output_path = var.gmail_notifier_bucket_archive_filepath
}

# https://github.com/hashicorp/terraform-provider-google/issues/1938 dynamic name, otherwise the Function cannot be updated
resource "google_storage_bucket_object" "slack_publisher_archive" {
  name   = format("%s#%s", var.slack_publisher_bucket_archive_filepath, data.archive_file.slack_publisher_archive.output_md5)
  bucket = google_storage_bucket.functions_bucket.name
  source = data.archive_file.slack_publisher_archive.output_path
}

resource "google_storage_bucket_object" "gmail_notifier_archive" {
  name   = format("%s#%s", var.gmail_notifier_bucket_archive_filepath, data.archive_file.gmail_notifier_archive.output_md5)
  bucket = google_storage_bucket.functions_bucket.name
  source = data.archive_file.gmail_notifier_archive.output_path
}

resource "google_cloudfunctions_function" "slack_publisher_function" {
  name        = "slack-publisher"
  description = "Receives messages from Pub/sub and send them to Slack"
  runtime     = "python39"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.slack_publisher_archive.name
  timeout               = 60
  entry_point           = var.slack_publish_function_entrypoint
  event_trigger {
    event_type = "providers/cloud.pubsub/eventTypes/topic.publish"
    resource   = "projects/${var.gcp_project}/topics/${var.slack_callForOffer_topic_name}"
  }
}

resource "google_cloudfunctions_function" "gmail_onNewMessage_function" {
  name        = "gmail-onNewMessage-receiver"
  description = "Receives messages from Pub/sub and publish them to ${var.gmail_onNewMessage_topic_name}"
  runtime     = "nodejs14"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive.name
  timeout               = 60
  entry_point           = var.gmail_onNewMessage_function_entrypoint
  event_trigger {
    event_type = "providers/cloud.pubsub/eventTypes/topic.publish"
    resource   = "projects/${var.gcp_project}/topics/${var.gmail_onNewMessage_topic_name}"
  }
}

resource "google_cloudfunctions_function" "oauth2_init_function" {
  name        = "oauth2-init"
  description = "Http Endpoint needed to init oauth2 token generation"
  runtime     = "nodejs14"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive.name
  timeout               = 60
  entry_point           = var.oauth2_init_function_entrypoint
  trigger_http          = true
}

resource "google_cloudfunctions_function" "oauth2_callback_function" {
  name        = "oauth2-callback"
  description = "Http Endpoint needed to save oauth2 token"
  runtime     = "nodejs14"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive.name
  timeout               = 60
  entry_point           = var.oauth2_callback_function_entrypoint
  trigger_http          = true
}

resource "google_cloudfunctions_function" "gmail_initWatch_function" {
  name        = "gmail-initWatch"
  description = "Http Endpoint needed to initiate GMail new e-mail watcher"
  runtime     = "nodejs14"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive.name
  timeout               = 60
  entry_point           = var.gmail_initWatch_function_entrypoint
  trigger_http          = true
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "slack_publisher_invoker" {
  project        = google_cloudfunctions_function.slack_publisher_function.project
  region         = google_cloudfunctions_function.slack_publisher_function.region
  cloud_function = google_cloudfunctions_function.slack_publisher_function.name

  role = "roles/cloudfunctions.invoker"
  #  member = "user:myFunctionInvoker@example.com" TODO maybe be more precise ?
  member = "allUsers"
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "gmail_onNewMessage_invoker" {
  project        = google_cloudfunctions_function.gmail_onNewMessage_function.project
  region         = google_cloudfunctions_function.gmail_onNewMessage_function.region
  cloud_function = google_cloudfunctions_function.gmail_onNewMessage_function.name

  role = "roles/cloudfunctions.invoker"
  #  member = "user:myFunctionInvoker@example.com" TODO maybe be more precise ?
  member = "allUsers"
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "oauth2_init_invoker" {
  project        = google_cloudfunctions_function.oauth2_init_function.project
  region         = google_cloudfunctions_function.oauth2_init_function.region
  cloud_function = google_cloudfunctions_function.oauth2_init_function.name

  role = "roles/cloudfunctions.invoker"
  #  member = "user:myFunctionInvoker@example.com" TODO maybe be more precise ?
  member = "allUsers"
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "oauth2_callback_invoker" {
  project        = google_cloudfunctions_function.oauth2_callback_function.project
  region         = google_cloudfunctions_function.oauth2_callback_function.region
  cloud_function = google_cloudfunctions_function.oauth2_callback_function.name

  role = "roles/cloudfunctions.invoker"
  #  member = "user:myFunctionInvoker@example.com" TODO maybe be more precise ?
  member = "allUsers"
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "gmail_initWatch_invoker" {
  project        = google_cloudfunctions_function.gmail_initWatch_function.project
  region         = google_cloudfunctions_function.gmail_initWatch_function.region
  cloud_function = google_cloudfunctions_function.gmail_initWatch_function.name

  role = "roles/cloudfunctions.invoker"
  #  member = "user:myFunctionInvoker@example.com" TODO maybe be more precise ?
  member = "allUsers"
}


