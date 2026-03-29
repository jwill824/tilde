variable "github_owner" {
  description = "GitHub repository owner (user or org)"
  type        = string
  default     = "jwill824"
}

variable "required_status_check_contexts" {
  description = "Status check context names required to pass before merging to main"
  type        = list(string)
  default     = ["CI"]
}
