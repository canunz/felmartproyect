// public/js/main.js
/**
 * Script principal para la plataforma Felmart
 */
document.addEventListener('DOMContentLoaded', function() {
  // Menú móvil
  initMobileMenu();
  
  // Mensajes flash
  initFlashMessages();
  
  // Inicializar modales
  initModals();
  
  // Inicializar tooltips
  initTooltips();
});

/**
* Inicializa el menú móvil
*/
function initMobileMenu() {
  const menuButton = document.getElementById('menuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (menuButton && mobileMenu) {
      menuButton.addEventListener('click', function() {
          mobileMenu.classList.toggle('hidden');
      });
  }
}

/**
* Inicializa los mensajes flash
*/
function initFlashMessages() {
  const flashMessages = document.querySelectorAll('.flash-message');
  
  flashMessages.forEach(flash => {
      // Auto cerrar después de 5 segundos
      setTimeout(() => {
          fadeOut(flash);
      }, 5000);
      
      // Botón de cerrar
      const closeBtn = flash.querySelector('.close-flash');
      if (closeBtn) {
          closeBtn.addEventListener('click', () => {
              fadeOut(flash);
          });
      }
  });
}

/**
* Desvanece un elemento
*/
function fadeOut(element) {
  element.style.opacity = '1';
  
  (function fade() {
      if ((element.style.opacity -= 0.1) < 0) {
          element.style.display = 'none';
      } else {
          requestAnimationFrame(fade);
      }
  })();
}

/**
* Inicializa los modales
*/
function initModals() {
  // Abrir modal
  document.querySelectorAll('[data-modal-target]').forEach(button => {
      button.addEventListener('click', () => {
          const modal = document.getElementById(button.dataset.modalTarget);
          if (modal) {
              modal.classList.remove('hidden');
          }
      });
  });
  
  // Cerrar modal
  document.querySelectorAll('[data-modal-close]').forEach(button => {
      button.addEventListener('click', () => {
          const modal = button.closest('.modal');
          if (modal) {
              modal.classList.add('hidden');
          }
      });
  });
  
  // Cerrar modal al hacer clic fuera
  document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
          if (e.target === modal) {
              modal.classList.add('hidden');
          }
      });
  });
}

/**
* Inicializa los tooltips
*/
function initTooltips() {
  document.querySelectorAll('[data-tooltip]').forEach(el => {
      el.addEventListener('mouseenter', () => {
          const tooltipText = el.getAttribute('data-tooltip');
          
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg';
          tooltip.textContent = tooltipText;
          
          document.body.appendChild(tooltip);
          
          const rect = el.getBoundingClientRect();
          tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5 + window.scrollY}px`;
          tooltip.style.left = `${rect.left + (el.offsetWidth / 2) - (tooltip.offsetWidth / 2) + window.scrollX}px`;
      });
      
      el.addEventListener('mouseleave', () => {
          document.querySelectorAll('.tooltip').forEach(t => t.remove());
      });
  });
}

/**
* Formatea una fecha a formato legible
*/
function formatDate(dateString) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
}

/**
* Formatea un número como moneda (CLP)
*/
function formatCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
  }).format(value);
}

/**
* Realiza una solicitud AJAX con CSRF protection
*/
function ajax(url, method = 'GET', data = null) {
  const options = {
      method,
      headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
      }
  };
  
  if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
  }
  
  return fetch(url, options).then(response => {
      if (!response.ok) {
          throw new Error('Error en la solicitud');
      }
      return response.json();
  });
}


