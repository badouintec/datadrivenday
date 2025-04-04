/**
 * Data Driven Day - Main JavaScript
 * Version: 4.0
 * Fecha: 2023
 */

// Esperar a que el DOM esté completamente cargado antes de ejecutar código
document.addEventListener('DOMContentLoaded', function() {
    console.log('⚡ DOM cargado - Iniciando scripts');
    
    // ---- Navegación ----
    initNavigation();
    
    // ---- Contador regresivo ----
    initCountdown();
    
    // ---- Animaciones de scroll ----
    initScrollAnimations();
    
    // ---- Funcionamiento FAQ ----
    initFaq();
    
    // ---- Botón volver arriba ----
    initBackToTop();
    
    console.log('✅ Todos los scripts inicializados correctamente');
});

// Función para inicializar la navegación
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    
    // Toggle menu móvil
    if (mobileMenu && navMenu) {
        mobileMenu.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });
        
        // Cerrar menú al hacer clic en enlaces
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.classList.remove('no-scroll');
            });
        });
    }
    
    // Cambiar estilo de navbar al hacer scroll
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    // Suavizar scroll en enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const navbarHeight = navbar ? navbar.offsetHeight : 0;
                const targetPosition = target.offsetTop - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Función para inicializar el contador regresivo
function initCountdown() {
    const days = document.getElementById('days');
    const hours = document.getElementById('hours');
    const minutes = document.getElementById('minutes');
    const seconds = document.getElementById('seconds');
    
    if (days && hours && minutes && seconds) {
        // Evento: 17 de Mayo de 2025
        const eventDate = new Date(2025, 4, 17, 9, 0, 0);
        
        function updateCountdown() {
            const now = new Date();
            const diff = eventDate - now;
            
            if (diff <= 0) {
                days.textContent = '00';
                hours.textContent = '00';
                minutes.textContent = '00';
                seconds.textContent = '00';
                return;
            }
            
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            
            days.textContent = d < 10 ? '0' + d : d;
            hours.textContent = h < 10 ? '0' + h : h;
            minutes.textContent = m < 10 ? '0' + m : m;
            seconds.textContent = s < 10 ? '0' + s : s;
        }
        
        // Actualizar inicial e intervalo
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
}

// Función para inicializar animaciones de scroll
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animatedElements.length) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            });
            
            animatedElements.forEach(el => observer.observe(el));
        } else {
            // Fallback para navegadores antiguos
            animatedElements.forEach(el => el.classList.add('is-visible'));
        }
    }
}

// Función para inicializar FAQs
function initFaq() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions.length) {
        faqQuestions.forEach(question => {
            question.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                const isOpen = this.classList.contains('active');
                
                // Cerrar todos los FAQs abiertos
                faqQuestions.forEach(q => {
                    q.classList.remove('active');
                    q.setAttribute('aria-expanded', 'false');
                    
                    if (q.nextElementSibling) {
                        q.nextElementSibling.style.maxHeight = null;
                    }
                });
                
                // Abrir el actual si estaba cerrado
                if (!isOpen) {
                    this.classList.add('active');
                    this.setAttribute('aria-expanded', 'true');
                    
                    if (answer) {
                        answer.style.maxHeight = answer.scrollHeight + "px";
                    }
                }
            });
        });
    }
}

// Función para inicializar botón volver arriba
function initBackToTop() {
    const backToTopButton = document.getElementById('back-to-top');
    
    if (backToTopButton) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });
    }
}