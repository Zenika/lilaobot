variable "gcp_project" {}

variable "gcp_credentials" {}

variable "gcp_region" {
  default = "europe-west1"
}

variable "gcp_zone" {
  default = "europe-west1-b"
}

variable "function_topic" {
}

variable "function_entrypoint" {
}

variable "bucket_archive_filepath" {
  default = "function_content.zip"
}