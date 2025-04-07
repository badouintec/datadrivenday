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
    
    // ---- Analítica ----
    initAnalytics();
    
    // ---- Presentación ----
    initPresentationModal();
    
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

// Versión mejorada de la función para animaciones de scroll con throttling para mejor rendimiento
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
            // Fallback para navegadores antiguos con throttling
            let ticking = false;
            const checkElements = () => {
                animatedElements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
                    if (rect.top <= windowHeight * 0.9 && rect.bottom >= 0) {
                        el.classList.add('is-visible');
                    }
                });
                ticking = false;
            };
            
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        checkElements();
                    });
                    ticking = true;
                }
            });
            
            // Check once on load
            checkElements();
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

// Función mejorada para back-to-top con throttling
function initBackToTop() {
    const backToTopButton = document.getElementById('back-to-top');
    
    if (backToTopButton) {
        let ticking = false;
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (window.pageYOffset > 300) {
                        backToTopButton.classList.add('visible');
                    } else {
                        backToTopButton.classList.remove('visible');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
        
        // Agregar evento de accesibilidad
        backToTopButton.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.scrollTo({top: 0, behavior: 'smooth'});
            }
        });
    }
}

// Nueva función para implementar Google Analytics
function initAnalytics() {
    // Solo cargar si no estamos en localhost/desarrollo
    if (window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.')) {
        // Código de configuración de Google Analytics
        const script = document.createElement('script');
        script.async = true;
        script.src = "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"; // Reemplazar con ID real
        document.head.appendChild(script);
        
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XXXXXXXXXX'); // Reemplazar con ID real
        
        // Trackear eventos personalizados
        document.querySelectorAll('.cta-button').forEach(button => {
            button.addEventListener('click', () => {
                gtag('event', 'click', {
                    'event_category': 'engagement',
                    'event_label': button.innerText,
                    'value': 1
                });
            });
        });
    }
}

// Función para verificar si un elemento es visible
function isElementVisible(el) {
    if (!el) return false;
    
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Inicialización del Modal de Presentación
function initPresentationModal() {
    // Setup presentation modal variables
    const modal = document.getElementById('presentationModal');
    const slides = document.querySelectorAll('.presentation .slide');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    const fsNavPrev = document.getElementById('fsNavPrev');
    const fsNavNext = document.getElementById('fsNavNext');
    const closeBtn = document.querySelector('.close');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const slideCounter = document.getElementById('slideCounter');
    const presentation = document.querySelector('.presentation');
    const preloader = document.getElementById('presentationPreloader');
    const openBtn = document.getElementById('openPresentation');
    
    // Si no hay modal, salir de la función
    if (!modal) {
        console.warn('Modal de presentación no encontrado');
        return;
    }
    
    // Initialize slide variables
    let currentSlide = 0;
    let slidesCount = slides.length;
    
    // Update counter display
    function updateCounter() {
        if (slideCounter) {
            slideCounter.textContent = `${currentSlide + 1} / ${slidesCount}`;
        }
    }
    
    // Navigate to a specific slide
    function goToSlide(index) {
        // Ensure valid index
        currentSlide = ((index % slidesCount) + slidesCount) % slidesCount;
        
        // Update slides visibility
        slides.forEach((slide, i) => {
            if (i === currentSlide) {
                slide.style.display = 'block';
                slide.classList.add('active');
            } else {
                slide.style.display = 'none';
                slide.classList.remove('active');
            }
        });
        
        // Update counter
        updateCounter();
    }
    
    // Open presentation modal
    function openPresentation() {
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Reset to first slide
            goToSlide(0);
            
            // Handle preloader
            if (preloader) {
                preloader.classList.remove('fade-out');
                setTimeout(() => {
                    preloader.classList.add('fade-out');
                }, 500);
            }
        }
    }
    
    // Close presentation modal
    function closePresentation() {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    // Toggle fullscreen mode with improved handling
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            try {
                if (presentation.requestFullscreen) {
                    presentation.requestFullscreen();
                } else if (presentation.webkitRequestFullscreen) {
                    presentation.webkitRequestFullscreen();
                } else if (presentation.mozRequestFullScreen) {
                    presentation.mozRequestFullScreen();
                } else if (presentation.msRequestFullscreen) {
                    presentation.msRequestFullscreen();
                }
                
                // Change icon and apply fullscreen optimizations
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                
                // Adjust slides for best fullscreen experience
                setTimeout(() => {
                    goToSlide(currentSlide); // Refresh current slide to ensure proper display
                }, 300);
                
            } catch (err) {
                console.error('Fullscreen error:', err);
            }
        } else {
            // Exit fullscreen
            try {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                
                // Reoptimize for windowed mode
                setTimeout(() => {
                    goToSlide(currentSlide); // Refresh current slide to ensure proper display
                }, 300);
                
            } catch (err) {
                console.error('Exit fullscreen error:', err);
            }
        }
    }
    
    // Setup event listeners
    if (openBtn) openBtn.addEventListener('click', openPresentation);
    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
    if (fsNavPrev) fsNavPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        goToSlide(currentSlide - 1);
    });
    if (fsNavNext) fsNavNext.addEventListener('click', (e) => {
        e.stopPropagation();
        goToSlide(currentSlide + 1);
    });
    if (closeBtn) closeBtn.addEventListener('click', closePresentation);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closePresentation();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (modal && modal.style.display === 'block') {
            if (e.key === 'ArrowLeft') goToSlide(currentSlide - 1);
            else if (e.key === 'ArrowRight' || e.key === ' ') goToSlide(currentSlide + 1);
            else if (e.key === 'Escape') closePresentation();
            else if (e.key === 'f') toggleFullscreen();
        }
    });
    
    // Fullscreen change detection
    document.addEventListener('fullscreenchange', function() {
        if (!document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        } else {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        }
    });
    
    // Make the openPresentationDirect function globally accessible
    window.openPresentationDirect = function() {
        openPresentation();
    };
}