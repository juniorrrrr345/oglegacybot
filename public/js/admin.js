// Scripts JavaScript pour le panel admin

// Utilitaires généraux
const AdminUtils = {
    // Afficher une notification toast
    showToast: function(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Supprimer le toast après fermeture
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },

    // Créer le conteneur de toasts
    createToastContainer: function() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    },

    // Confirmer une action
    confirm: function(message, callback) {
        if (confirm(message)) {
            callback();
        }
    },

    // Formater les dates
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Copier dans le presse-papiers
    copyToClipboard: function(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copié dans le presse-papiers');
        }).catch(() => {
            this.showToast('Erreur lors de la copie', 'danger');
        });
    }
};

// Gestion des formulaires
const FormHandler = {
    // Soumettre un formulaire avec loading
    submitWithLoading: function(formElement, buttonElement) {
        const originalText = buttonElement.innerHTML;
        const loadingText = '<span class="spinner-border spinner-border-sm" role="status"></span> Chargement...';
        
        buttonElement.innerHTML = loadingText;
        buttonElement.disabled = true;
        
        // Restaurer le bouton après 3 secondes (fallback)
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.disabled = false;
        }, 3000);
    },

    // Validation côté client
    validateForm: function(formElement) {
        const inputs = formElement.querySelectorAll('input[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
            } else {
                input.classList.remove('is-invalid');
            }
        });
        
        return isValid;
    }
};

// Gestion des uploads
const UploadHandler = {
    // Upload avec progress bar
    uploadWithProgress: function(fileInput, progressContainer, callback) {
        const file = fileInput.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append(fileInput.name, file);
        
        const xhr = new XMLHttpRequest();
        
        // Progress bar
        const progressBar = progressContainer.querySelector('.upload-progress-bar');
        if (progressBar) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.style.width = percentComplete + '%';
                }
            });
        }
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                callback(response);
            } else {
                AdminUtils.showToast('Erreur lors de l\'upload', 'danger');
            }
        });
        
        xhr.addEventListener('error', () => {
            AdminUtils.showToast('Erreur réseau lors de l\'upload', 'danger');
        });
        
        xhr.open('POST', fileInput.form.action);
        xhr.send(formData);
    }
};

// Gestion des statistiques en temps réel
const StatsUpdater = {
    interval: null,
    
    start: function(updateInterval = 30000) {
        this.interval = setInterval(() => {
            this.updateStats();
        }, updateInterval);
    },
    
    stop: function() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },
    
    updateStats: async function() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            // Mettre à jour les éléments avec les nouvelles stats
            this.updateStatElement('.stat-users', stats.users);
            this.updateStatElement('.stat-interactions', stats.interactions);
            this.updateStatElement('.stat-starts', stats.starts);
            this.updateStatElement('.stat-configs', stats.configs);
            
        } catch (error) {
            console.error('Erreur mise à jour stats:', error);
        }
    },
    
    updateStatElement: function(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
            element.classList.add('fade-in');
            setTimeout(() => element.classList.remove('fade-in'), 300);
        }
    }
};

// Gestion des tableaux
const TableHandler = {
    // Tri des colonnes
    sortTable: function(table, columnIndex, ascending = true) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aValue = a.cells[columnIndex].textContent.trim();
            const bValue = b.cells[columnIndex].textContent.trim();
            
            if (ascending) {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
        
        // Réorganiser les lignes
        rows.forEach(row => tbody.appendChild(row));
    },
    
    // Filtrage des lignes
    filterTable: function(table, searchTerm) {
        const tbody = table.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Marquer le lien actuel dans la sidebar
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
    
    // Auto-dismiss des alertes après 5 secondes
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
    
    // Démarrer la mise à jour des stats si on est sur le dashboard
    if (currentPath === '/' || currentPath === '/dashboard') {
        StatsUpdater.start();
    }
});

// Nettoyer les intervalles avant de quitter la page
window.addEventListener('beforeunload', function() {
    StatsUpdater.stop();
});

// Exposer les utilitaires globalement
window.AdminUtils = AdminUtils;
window.FormHandler = FormHandler;
window.UploadHandler = UploadHandler;
window.StatsUpdater = StatsUpdater;
window.TableHandler = TableHandler;