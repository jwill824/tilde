output "repository_url" {
  description = "GitHub repository HTML URL"
  value       = github_repository.tilde.html_url
}

output "branch_protection_id" {
  description = "Terraform resource ID for the main branch protection rule"
  value       = github_branch_protection.main.id
}
