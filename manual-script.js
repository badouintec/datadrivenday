document.addEventListener('DOMContentLoaded', () => {
    // Manual page navigation
    const tocLinks = document.querySelectorAll('.toc-link');
    const manualPages = document.querySelectorAll('.manual-page');
    const prevButtons = document.querySelectorAll('.prev-page');
    const nextButtons = document.querySelectorAll('.next-page');
    
    // Function to show selected page
    const showPage = (pageId) => {
        // Hide all pages
        manualPages.forEach(page => {
            page.classList.remove('active');
        });
        
        // Remove active class from all TOC links
        tocLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Show the selected page
        const selectedPage = document.querySelector(pageId);
        if (selectedPage) {
            selectedPage.classList.add('active');
            
            // Highlight the current TOC link
            const currentLink = document.querySelector(`.toc-link[href="${pageId}"]`);
            if (currentLink) {
                currentLink.classList.add('active');
            }
            
            // Scroll to top of content
            selectedPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    
    // TOC link click handlers
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('href');
            showPage(pageId);
            
            // Update URL hash without scrolling
            history.pushState(null, null, pageId);
        });
    });
    
    // Previous/Next button click handlers
    prevButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const prevPageId = button.getAttribute('href');
            showPage(prevPageId);
            history.pushState(null, null, prevPageId);
        });
    });
    
    nextButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const nextPageId = button.getAttribute('href');
            showPage(nextPageId);
            history.pushState(null, null, nextPageId);
        });
    });
    
    // Handle initial page load with hash
    if (window.location.hash) {
        showPage(window.location.hash);
    }
    
    // Update active page on hash change
    window.addEventListener('hashchange', () => {
        showPage(window.location.hash);
    });
    
    // Make TOC sticky on scroll
    const toc = document.querySelector('.toc-container');
    const tocOffset = toc ? toc.offsetTop : 0;
    const headerHeight = document.querySelector('.navbar').offsetHeight;
    
    window.addEventListener('scroll', () => {
        if (toc && window.innerWidth > 992) {
            if (window.pageYOffset > tocOffset - headerHeight) {
                toc.style.top = `${headerHeight + 20}px`;
            } else {
                toc.style.top = '100px';
            }
        }
    });
    
    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href').length > 1) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Add better handling for mobile navigation
    if (window.innerWidth <= 768) {
        tocLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Optional: Add code here to collapse the TOC on mobile after selection
                // This would be if you want to implement a collapsible TOC on mobile
            });
        });
    }
    
    // Better handling for the page navigation on different screen sizes
    const adjustPageNavigation = () => {
        const pageNavigations = document.querySelectorAll('.page-navigation');
        
        pageNavigations.forEach(nav => {
            if (window.innerWidth <= 480) {
                // For very small screens, we could adjust navigation elements here if needed
            }
        });
    };
    
    // Run on load and resize
    adjustPageNavigation();
    window.addEventListener('resize', adjustPageNavigation);
    
    // Add touch support for better mobile experience
    let touchStartX = 0;
    let touchEndX = 0;
    
    const handleSwipe = () => {
        if (touchStartX - touchEndX > 100) {
            // Swipe left - go to next page
            const activePage = document.querySelector('.manual-page.active');
            if (activePage) {
                const nextBtn = activePage.querySelector('.next-page');
                if (nextBtn) {
                    const nextPageId = nextBtn.getAttribute('href');
                    showPage(nextPageId);
                    history.pushState(null, null, nextPageId);
                }
            }
        }
        
        if (touchEndX - touchStartX > 100) {
            // Swipe right - go to previous page
            const activePage = document.querySelector('.manual-page.active');
            if (activePage) {
                const prevBtn = activePage.querySelector('.prev-page');
                if (prevBtn) {
                    const prevPageId = prevBtn.getAttribute('href');
                    showPage(prevPageId);
                    history.pushState(null, null, prevPageId);
                }
            }
        }
    };
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});
});

console.log("Manual script loaded");
