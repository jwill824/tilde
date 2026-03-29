variable "cloudflare_api_token" {
  description = "Cloudflare API token — sourced from the tilde-shared TFC Variable Set"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID — sourced from the tilde-shared TFC Variable Set"
  type        = string
}

variable "zone_id" {
  description = "Cloudflare DNS zone ID for thingstead.io — workspace-specific variable"
  type        = string
}
