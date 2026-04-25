variable "project_id" {
  description = "ID del proyecto GCP"
  type        = string
  default     = "sa-practicas-201114493"
}

variable "region" {
  description = "Region de GCP"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zona de GCP"
  type        = string
  default     = "us-central1-a"
}

variable "machine_type" {
  description = "Tipo de maquina para la VM"
  type        = string
  default     = "e2-standard-4"
}

variable "vm_name" {
  description = "Nombre de la VM"
  type        = string
  default     = "k3s-helpdesk"
}

variable "disk_size_gb" {
  description = "Tamano del disco en GB"
  type        = number
  default     = 50
}

variable "ssh_user" {
  description = "Usuario SSH"
  type        = string
  default     = "ubuntu"
}

variable "ssh_pub_key_file" {
  description = "Ruta al archivo de clave publica SSH"
  type        = string
  default     = "~/.ssh/k3s_key.pub"
}
