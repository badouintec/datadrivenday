document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    const body = document.querySelector('body');
    
    mobileMenu.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        navMenu.classList.toggle('active');
        body.classList.toggle('no-scroll'); // Prevent body scroll when menu is open
    });
    
    // Close mobile menu when clicking on a nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            mobileMenu.classList.remove('active');
            body.classList.remove('no-scroll');
        });
    });
    
    // Smooth scrolling for anchor links with offset for navbar height
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target element
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Navbar style change on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Active menu item based on scroll position
    const sections = document.querySelectorAll('section, header');
    const navItems = document.querySelectorAll('.nav-link');
    
    // Set initial active menu item
    setActiveMenuItem();
    
    // Update active menu item on scroll
    window.addEventListener('scroll', setActiveMenuItem);
    
    function setActiveMenuItem() {
        let current = '';
        const navHeight = navbar.offsetHeight;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            // If our position is within this section, mark it as active
            // Add offset for navbar height plus some padding
            if (window.scrollY >= sectionTop - navHeight - 50) {
                current = section.getAttribute('id');
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });

        // Special case for the manual link which is not on the page
        const manualLink = document.querySelector('.manual-link');
        if (manualLink && window.location.pathname.includes('manual.html')) {
            navItems.forEach(item => item.classList.remove('active'));
            manualLink.classList.add('active');
        }
    }
    
    // Scroll animation with Intersection Observer
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries, observer) => {
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
    
    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        const isNavLink = e.target.closest('.nav-link');
        const isMenuToggle = e.target.closest('.menu-toggle');
        const isOpenMenu = navMenu.classList.contains('active');
        
        if (isOpenMenu && !isNavLink && !isMenuToggle && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            mobileMenu.classList.remove('active');
            body.classList.remove('no-scroll');
        }
    });

    // Contador regresivo
    const countdownElement = {
        days: document.getElementById('days'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds')
    };
    
    if (countdownElement.days && countdownElement.hours && countdownElement.minutes && countdownElement.seconds) {
        // Fecha del evento (año, mes [0-11], día, hora, minuto)
        const eventDate = new Date(2025, 4, 17, 9, 0); // 17 de Mayo 2025, 9:00 AM
        
        function updateCountdown() {
            const now = new Date();
            const difference = eventDate - now;
            
            if (difference <= 0) {
                // El evento ya pasó
                countdownElement.days.textContent = '00';
                countdownElement.hours.textContent = '00';
                countdownElement.minutes.textContent = '00';
                countdownElement.seconds.textContent = '00';
                return;
            }
            
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            countdownElement.days.textContent = days < 10 ? '0' + days : days;
            countdownElement.hours.textContent = hours < 10 ? '0' + hours : hours;
            countdownElement.minutes.textContent = minutes < 10 ? '0' + minutes : minutes;
            countdownElement.seconds.textContent = seconds < 10 ? '0' + seconds : seconds;
        }
        
        // Actualizar cada segundo
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
    
    // Botón volver arriba
    const backToTopButton = document.getElementById('back-to-top');
    
    if (backToTopButton) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) { // Mostrar botón después de bajar 300px
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });
    }
    
    // Animaciones de scroll
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    function checkScroll() {
        animateElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('active');
            }
        });
    }
    
    // Disparar una vez al cargar para elementos visibles
    checkScroll();
    
    window.addEventListener('scroll', checkScroll);
    
    // Manejo de FAQ
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions) {
        faqQuestions.forEach(question => {
            question.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                const isOpen = this.classList.contains('active');
                
                // Cerrar todos los FAQs
                faqQuestions.forEach(q => {
                    q.classList.remove('active');
                    q.nextElementSibling.style.maxHeight = null;
                });
                
                // Abrir el actual si estaba cerrado
                if (!isOpen) {
                    this.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + "px";
                }
            });
        });
    }
});

// Add no-scroll to body to prevent scrolling when mobile menu is open
document.head.insertAdjacentHTML('beforeend', `
    <style>
        body.no-scroll {
            overflow: hidden;
        }
    </style>
`);

// Better touch handling for mobile devices
document.addEventListener('touchstart', () => {}, {passive: true});

console.log("Data Driven Day script v3 ¡cargado y listo!");