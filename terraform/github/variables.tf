variable "github_owner" {
  description = "GitHub repository owner (user or org)"
  type        = string
  default     = "jwill824"
}

variable "required_status_check_contexts" {
  description = "Status check context names required to pass before merging to main"
  type        = list(string)
  default     = ["Lint, Build & Test", "Build & Deploy (thingstead.io)"]
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token — stored as CLOUDFLARE_API_TOKEN secret in the production GitHub environment"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID — stored as CLOUDFLARE_ACCOUNT_ID secret in the production GitHub environment"
  type        = string
}
