terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Red VPC
resource "google_compute_network" "helpdesk_vpc" {
  name                    = "helpdesk-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "helpdesk_subnet" {
  name          = "helpdesk-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.helpdesk_vpc.id
}

# Firewall
resource "google_compute_firewall" "allow_ssh" {
  name    = "helpdesk-allow-ssh"
  network = google_compute_network.helpdesk_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["k3s-node"]
}

resource "google_compute_firewall" "allow_http_https" {
  name    = "helpdesk-allow-http-https"
  network = google_compute_network.helpdesk_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "6443", "30000-32767"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["k3s-node"]
}

resource "google_compute_firewall" "allow_internal" {
  name    = "helpdesk-allow-internal"
  network = google_compute_network.helpdesk_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = ["10.0.1.0/24"]
}

# IP estatica
resource "google_compute_address" "k3s_static_ip" {
  name   = "k3s-helpdesk-ip"
  region = var.region
}

# VM K3s
resource "google_compute_instance" "k3s_node" {
  name         = var.vm_name
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["k3s-node"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = var.disk_size_gb
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.helpdesk_subnet.id
    access_config {
      nat_ip = google_compute_address.k3s_static_ip.address
    }
  }

  metadata = {
    ssh-keys = "${var.ssh_user}:${file(var.ssh_pub_key_file)}"
  }

  metadata_startup_script = <<-EOT
    #!/bin/bash
    set -e

    # Actualizar sistema
    apt-get update -y
    apt-get upgrade -y

    # Instalar dependencias
    apt-get install -y curl wget git

    # Instalar K3s
    curl -sfL https://get.k3s.io | sh -

    # Esperar a que K3s este listo
    sleep 30

    # Configurar kubectl para el usuario
    mkdir -p /home/${var.ssh_user}/.kube
    cp /etc/rancher/k3s/k3s.yaml /home/${var.ssh_user}/.kube/config
    sed -i "s/127.0.0.1/$(curl -s ifconfig.me)/g" /home/${var.ssh_user}/.kube/config
    chown -R ${var.ssh_user}:${var.ssh_user} /home/${var.ssh_user}/.kube

    echo "K3s instalado correctamente"
  EOT

  service_account {
    scopes = ["cloud-platform"]
  }
}
