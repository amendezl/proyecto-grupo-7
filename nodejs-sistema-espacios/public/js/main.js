// JavaScript principal del sistema

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Función principal de inicialización
function initializeApp() {
    // Inicializar tooltips de Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Inicializar modales
    initializeModals();
    
    // Configurar manejo de formularios
    setupFormHandlers();
    
    // Configurar confirmaciones de eliminación
    setupDeleteConfirmations();
    
    // Auto-hide alerts después de 5 segundos
    autoHideAlerts();
}

// Inicializar modales
function initializeModals() {
    // Modal de confirmación genérico
    if (!document.getElementById('confirmModal')) {
        const modalHTML = `
            <div class="modal fade" id="confirmModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Confirmar Acción</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p id="confirmMessage">¿Está seguro de que desea realizar esta acción?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-danger" id="confirmButton">Confirmar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// Configurar manejadores de formularios
function setupFormHandlers() {
    // Validación en tiempo real
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('input', function(e) {
            validateField(e.target);
        });
    });

    // Prevenir doble envío de formularios
    const submitButtons = document.querySelectorAll('form button[type="submit"]');
    submitButtons.forEach(button => {
        button.addEventListener('click', function() {
            const form = this.closest('form');
            if (form.checkValidity()) {
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
                
                // Reactivar después de 5 segundos como medida de seguridad
                setTimeout(() => {
                    this.disabled = false;
                    this.innerHTML = this.dataset.originalText || 'Guardar';
                }, 5000);
            }
        });
    });
}

// Configurar confirmaciones de eliminación
function setupDeleteConfirmations() {
    const deleteButtons = document.querySelectorAll('[data-action="delete"]');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const message = this.dataset.message || '¿Está seguro de que desea eliminar este elemento?';
            const url = this.dataset.url || this.href;
            
            showConfirmModal(message, function() {
                performDelete(url);
            });
        });
    });
}

// Mostrar modal de confirmación
function showConfirmModal(message, callback) {
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    document.getElementById('confirmMessage').textContent = message;
    
    const confirmButton = document.getElementById('confirmButton');
    
    // Limpiar eventos anteriores
    confirmButton.replaceWith(confirmButton.cloneNode(true));
    const newConfirmButton = document.getElementById('confirmButton');
    
    newConfirmButton.addEventListener('click', function() {
        modal.hide();
        if (callback) callback();
    });
    
    modal.show();
}

// Realizar eliminación via AJAX
function performDelete(url) {
    fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showAlert('danger', data.error);
        } else {
            showAlert('success', data.message || 'Elemento eliminado exitosamente');
            // Recargar la página después de 1 segundo
            setTimeout(() => location.reload(), 1000);
        }
    })
    .catch(error => {
        showAlert('danger', 'Error al eliminar el elemento');
        console.error('Error:', error);
    });
}

// Mostrar alerta dinámica
function showAlert(type, message) {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Buscar contenedor de alertas o crear uno
    let alertContainer = document.querySelector('.alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container';
        document.querySelector('main').insertBefore(alertContainer, document.querySelector('main').firstChild);
    }
    
    alertContainer.insertAdjacentHTML('afterbegin', alertHTML);
    
    // Auto-hide después de 5 segundos
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Auto-hide alerts existentes
function autoHideAlerts() {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            if (alert.classList.contains('show')) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    });
}

// Validar campo individual
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    
    // Limpiar mensajes de error anteriores
    const errorElement = field.parentNode.querySelector('.invalid-feedback');
    if (errorElement) {
        errorElement.remove();
    }
    
    field.classList.remove('is-invalid', 'is-valid');
    
    // Validaciones específicas
    let isValid = true;
    let errorMessage = '';
    
    if (field.required && !value) {
        isValid = false;
        errorMessage = 'Este campo es obligatorio';
    } else if (field.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
        errorMessage = 'Ingrese un email válido';
    } else if (field.type === 'tel' && value && !isValidPhone(value)) {
        isValid = false;
        errorMessage = 'Ingrese un teléfono válido';
    } else if (field.pattern && value && !new RegExp(field.pattern).test(value)) {
        isValid = false;
        errorMessage = 'El formato no es válido';
    }
    
    // Mostrar resultado de validación
    if (!isValid) {
        field.classList.add('is-invalid');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = errorMessage;
        field.parentNode.appendChild(errorDiv);
    } else if (value) {
        field.classList.add('is-valid');
    }
    
    return isValid;
}

// Validar email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validar teléfono
function isValidPhone(phone) {
    const re = /^[\+]?[0-9\s\-\(\)]{7,15}$/;
    return re.test(phone);
}

// Formatear fecha para mostrar
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

// Formatear hora para mostrar
function formatTime(timeString) {
    if (!timeString) return '';
    return timeString.substring(0, 5);
}

// Debounce function para búsquedas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Funciones utilitarias para autocompletado
function setupAutocomplete(inputElement, searchUrl, displayProperty = 'nombre') {
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'autocomplete-results position-absolute w-100 bg-white border border-top-0 rounded-bottom shadow-sm';
    resultsContainer.style.display = 'none';
    resultsContainer.style.zIndex = '1050';
    resultsContainer.style.maxHeight = '200px';
    resultsContainer.style.overflowY = 'auto';
    
    inputElement.parentNode.style.position = 'relative';
    inputElement.parentNode.appendChild(resultsContainer);
    
    const searchFunction = debounce(async (query) => {
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`${searchUrl}?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            
            if (results.length > 0) {
                resultsContainer.innerHTML = results.map(item => 
                    `<div class="autocomplete-item p-2 cursor-pointer" data-value="${item.id}" style="cursor: pointer;">
                        ${item[displayProperty]}
                    </div>`
                ).join('');
                
                resultsContainer.style.display = 'block';
                
                // Agregar event listeners a los items
                resultsContainer.querySelectorAll('.autocomplete-item').forEach(item => {
                    item.addEventListener('click', function() {
                        inputElement.value = this.textContent.trim();
                        inputElement.dataset.selectedId = this.dataset.value;
                        resultsContainer.style.display = 'none';
                        
                        // Disparar evento personalizado
                        inputElement.dispatchEvent(new CustomEvent('autocomplete:select', {
                            detail: { id: this.dataset.value, text: this.textContent.trim() }
                        }));
                    });
                });
            } else {
                resultsContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error en autocompletado:', error);
            resultsContainer.style.display = 'none';
        }
    }, 300);
    
    inputElement.addEventListener('input', function() {
        searchFunction(this.value);
    });
    
    // Ocultar resultados al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!inputElement.parentNode.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
}

// Exportar funciones globales
window.AppUtils = {
    showAlert,
    showConfirmModal,
    formatDate,
    formatTime,
    setupAutocomplete,
    debounce
};
