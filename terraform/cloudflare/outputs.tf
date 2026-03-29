output "pages_project_url" {
  description = "Cloudflare Pages default subdomain URL"
  value       = "https://${cloudflare_pages_project.thingstead.name}.pages.dev"
}

output "custom_domain_status" {
  description = "Custom domain verification status"
  value       = cloudflare_pages_domain.thingstead_io.status
}
