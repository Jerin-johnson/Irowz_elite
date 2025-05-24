document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('adminSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const body = document.body;
    
    let isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    let isMobile = window.innerWidth <= 768;
    
    // Initialize sidebar state
    function initSidebar() {
        isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            body.classList.remove('sidebar-open', 'sidebar-collapsed');
            sidebar.classList.remove('collapsed');
        } else {
            body.classList.add('sidebar-open');
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
                body.classList.add('sidebar-collapsed');
                body.classList.remove('sidebar-open');
            }
        }
        
        // Set active nav item based on current page
        setActiveNavItem();
    }
    
    // Toggle sidebar
    toggleBtn.addEventListener('click', function() {
        if (isMobile) {
            // Mobile: Show/hide sidebar
            const isOpen = sidebar.classList.contains('mobile-open');
            if (isOpen) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('show');
            } else {
                sidebar.classList.add('mobile-open');
                overlay.classList.add('show');
            }
        } else {
            // Desktop: Collapse/expand sidebar
            isCollapsed = !isCollapsed;
            sidebar.classList.toggle('collapsed', isCollapsed);
            body.classList.toggle('sidebar-collapsed', isCollapsed);
            body.classList.toggle('sidebar-open', !isCollapsed);
            
            // Save state
            localStorage.setItem('sidebarCollapsed', isCollapsed);
        }
    });
    
    // Close mobile sidebar when clicking overlay
    overlay.addEventListener('click', function() {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        initSidebar();
    });
    
    // Set active navigation item based on current page
    function setActiveNavItem() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }
    
    // Add tooltips for collapsed sidebar
    function addTooltips() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const text = link.querySelector('.nav-text').textContent;
            link.setAttribute('data-tooltip', text);
        });
    }
    
    // Navigation click handler for mobile
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            if (isMobile) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('show');
            }
        });
    });
    
    // Initialize
    initSidebar();
    addTooltips();
});