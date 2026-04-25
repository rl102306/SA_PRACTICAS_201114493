output "vm_external_ip" {
  description = "IP publica de la VM K3s"
  value       = google_compute_address.k3s_static_ip.address
}

output "vm_name" {
  description = "Nombre de la instancia VM"
  value       = google_compute_instance.k3s_node.name
}

output "vm_zone" {
  description = "Zona de la VM"
  value       = google_compute_instance.k3s_node.zone
}

output "ssh_command" {
  description = "Comando SSH para conectarse a la VM"
  value       = "ssh ${var.ssh_user}@${google_compute_address.k3s_static_ip.address}"
}

output "kubeconfig_command" {
  description = "Comando para obtener kubeconfig"
  value       = "gcloud compute scp ${var.vm_name}:/home/${var.ssh_user}/.kube/config ~/.kube/config --zone=${var.zone}"
}
