resource "google_pubsub_topic" "default" {
  name = var.function_topic
}

resource "google_storage_bucket" "functions_bucket" {
  name          = "lilaobot-functions-storage"
  force_destroy = true
  location      = var.gcp_region
}

data "archive_file" "gmail_notifier_archive" {
  type        = "zip"
  source_dir  = "../functions/gmail-notifier"
  output_path = "gmail_notifier.zip"
}

resource "google_storage_bucket_object" "gmail_notifier_archive_bucket_object" {
  name   = format("%s#%s", "gmail_notifier.zip", data.archive_file.gmail_notifier_archive.output_md5)
  bucket = google_storage_bucket.functions_bucket.name
  source = data.archive_file.gmail_notifier_archive.output_path
}

locals {
  environment_variables = {
    FUNCTION_REGION = var.gcp_region
    GCP_PROJECT     = var.gcp_project
    TOPIC_ID        = var.function_topic
  }
}

resource "google_cloudfunctions_function" "gmail_notifier_oauth2init_function" {
  name        = "oauth2init"
  description = "gmail-notifier entry point, will redirect to auth page (Google OpenID connect)"
  runtime     = "nodejs14"

  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive_bucket_object.name
  timeout               = 60
  entry_point           = "oauth2init"
  trigger_http          = true
  environment_variables = local.environment_variables
}

resource "google_cloudfunctions_function" "gmail_notifier_oauth2callback_function" {
  name        = "oauth2callback"
  description = "redirection callback after user auth"
  runtime     = "nodejs14"

  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive_bucket_object.name
  timeout               = 60
  entry_point           = "oauth2callback"
  trigger_http          = true
  environment_variables = local.environment_variables
}

resource "google_cloudfunctions_function" "gmail_notifier_initWatch_function" {
  name        = "initWatch"
  description = "init watch on given gmail inbox"
  runtime     = "nodejs14"

  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive_bucket_object.name
  timeout               = 60
  entry_point           = "initWatch"
  trigger_http          = true
  environment_variables = local.environment_variables
}

resource "google_cloudfunctions_function" "gmail_notifier_endWatch_function" {
  name        = "endWatch"
  description = "end watch on given gmail inbox"
  runtime     = "nodejs14"

  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive_bucket_object.name
  timeout               = 60
  entry_point           = "endWatch"
  trigger_http          = true
  environment_variables = local.environment_variables
}

resource "google_cloudfunctions_function" "gmail_notifier_onNewMessage_function" {
  name        = "onNewMessage"
  description = "onNewMessage on given gmail inbox"
  runtime     = "nodejs14"

  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive_bucket_object.name
  timeout               = 60
  entry_point           = "onNewMessage"
  event_trigger {
    event_type = "providers/cloud.pubsub/eventTypes/topic.publish"
    resource   = "projects/${var.gcp_project}/topics/${var.function_topic}"
  }
  environment_variables = local.environment_variables
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "oauth2init_allusers_permission" {
  project        = google_cloudfunctions_function.gmail_notifier_oauth2init_function.project
  region         = google_cloudfunctions_function.gmail_notifier_oauth2init_function.region
  cloud_function = google_cloudfunctions_function.gmail_notifier_oauth2init_function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

resource "google_cloudfunctions_function_iam_member" "oauth2callback_allusers_permission" {
  project        = google_cloudfunctions_function.gmail_notifier_oauth2callback_function.project
  region         = google_cloudfunctions_function.gmail_notifier_oauth2callback_function.region
  cloud_function = google_cloudfunctions_function.gmail_notifier_oauth2callback_function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

resource "google_cloudfunctions_function_iam_member" "initWatch_allusers_permission" {
  project        = google_cloudfunctions_function.gmail_notifier_initWatch_function.project
  region         = google_cloudfunctions_function.gmail_notifier_initWatch_function.region
  cloud_function = google_cloudfunctions_function.gmail_notifier_initWatch_function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

resource "google_cloudfunctions_function_iam_member" "onNewMessage_allusers_permission" {
  project        = google_cloudfunctions_function.gmail_notifier_onNewMessage_function.project
  region         = google_cloudfunctions_function.gmail_notifier_onNewMessage_function.region
  cloud_function = google_cloudfunctions_function.gmail_notifier_onNewMessage_function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

