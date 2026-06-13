(function () {
    // ============ PRODUCT DATA (LOADED FROM products.js) ============
    const allProducts = products;

    // ============ STATE ============
    let wishlist = JSON.parse(localStorage.getItem('woodnest_wishlist') || '[]');
    let currentProductId = 0;
    let currentQuickViewId = null;
    let currentFilter = 'all';
    let locomotiveScrollInstance = null;

    // ============ LOCOMOTIVE SCROLL INIT ============
    function initLocomotive() {
        if (locomotiveScrollInstance) {
            locomotiveScrollInstance.destroy();
        }
        const scrollContainer = document.querySelector('#smoothScroll [data-scroll-container]');
        if (!scrollContainer) return;
        locomotiveScrollInstance = new LocomotiveScroll({
            el: scrollContainer,
            smooth: true,
            lerp: 0.08,
            multiplier: 1.0,
            smartphone: { smooth: true },
            tablet: { smooth: true },
        });
        // Refresh ScrollTrigger after Locomotive updates
        locomotiveScrollInstance.on('scroll', () => {
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
        });
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.scrollerProxy(scrollContainer, {
                scrollTop(value) {
                    return arguments.length ?
                        locomotiveScrollInstance.scrollTo(value, {
                            duration: 0,
                            disableLerp: true
                        }) :
                        locomotiveScrollInstance.scroll.instance.scroll.y;
                },
                getBoundingClientRect() {
                    return {
                        top: 0, left: 0, width: window.innerWidth,
                        height: window.innerHeight
                    };
                },
                pinType: 'transform'
            });
            ScrollTrigger.refresh();
        }
    }

    // ============ NAVIGATION ============
    function navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        const targetPage = document.getElementById('page-' + page);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update nav active
        document.querySelectorAll('.nav-links a[data-page]')
            .forEach(a => a.classList.remove('active'));

        const navLink = document.querySelector(`.nav-links a[data-page="${page}"]`);
        if (navLink) navLink.classList.add('active');

        // Update header
        const header = document.getElementById('header');
        if (page === 'home') {
            header.classList.remove('scrolled');
        } else {
            header.classList.add('scrolled');
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Re-render pages
        if (page === 'shop') renderAllProducts();
        if (page === 'wishlist') renderWishlist();
        if (page === 'home') renderFeaturedProducts();

        // Refresh GSAP only
        setTimeout(() => {
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        }, 300);

        closeMobileMenu();
        setTimeout(initScrollAnimations, 400);
    }
    window.navigateTo = navigateTo;

    // ============ MOBILE MENU ============
    function toggleMobileMenu() {
        document.getElementById('mobileMenu').classList.toggle('open');
        document.getElementById('overlay').classList.toggle('active');
    }

    function closeMobileMenu() {
        document.getElementById('mobileMenu').classList.remove('open');
        document.getElementById('overlay').classList.remove('active');
    }
    window.toggleMobileMenu = toggleMobileMenu;
    window.closeMobileMenu = closeMobileMenu;
    document.getElementById('overlay').addEventListener('click', closeMobileMenu);

    // ============ RENDER PRODUCT CARD ============
    function createProductCard(product) {
        const isLiked = wishlist.includes(product.id);
        const card = document.createElement('div');
        card.className = 'product-card tilt-container';
        card.style.cursor = 'pointer';
        card.setAttribute('data-category', product.category);
        card.setAttribute('data-fabric', product.fabric);
        card.setAttribute('data-color', product.color);
        card.setAttribute('data-id', product.id);
        card.onclick = () => openProduct(product.id);

        card.innerHTML = `
              <div class="product-card-image">
                <img src="${product.images ? product.images[0] : product.image}" alt="${product.name}" loading="lazy">
                <span class="product-card-badge">Handcrafted</span>
                <span class="product-card-tag">${product.category.replace('-', ' ')}</span>
              </div>
              <div class="product-card-info">
                <h3 class="product-card-name">${product.name}</h3>
                <p class="product-card-category">${product.wood || 'Solid Wood'} · ${product.fabric || 'Premium Fabric'}</p>
                <p class="product-card-price"><span>From</span> ₹${product.price.toLocaleString('en-IN')}</p>
                <div class="product-card-colors">
                  <span class="color-dot active" style="background:${product.color === 'brown' ? '#8B5E3C' : product.color === 'black' ? '#3A3A3A' : product.color === 'beige' ? '#D6C8B8' : '#C49A6C'};"></span>
                </div>
                <button class="inquiry-btn" onclick="event.stopPropagation(); window.open('https://wa.me/919933447711?text=' + encodeURIComponent('Hello WoodNest, I am interested in the ${product.name}. Could you provide more details?'), '_blank')">Inquiry Now</button>
              </div>`;
        // 3D tilt
        const tiltInner = card.querySelector('.product-card-image');
        let tiltTimeout;
        let rafId = null;
        let rect = null;

        card.addEventListener('mouseenter', () => {
            rect = card.getBoundingClientRect(); // calculate once
        });

        card.addEventListener('mousemove', (e) => {
            if (rafId) return;

            rafId = requestAnimationFrame(() => {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -5;
                const rotateY = ((x - centerX) / centerX) * 5;

                card.style.transform =
                    `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

                rafId = null;
            });
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform =
                'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        });
        return card;
    }

    // ============ PRODUCT PAGE LOGIC ============
    let currentProduct = null;
    function openProduct(id) {
        window.location.href = `product.html?id=${id}`;
    }

    function changePdpImage(el) {
        document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        document.getElementById('pdpMedia').innerHTML = el.innerHTML;
    }

    function renderRelatedProducts(category, currentId) {
        const container = document.getElementById('pdpRelatedGrid');
        if (!container) return;
        container.innerHTML = '';
        const related = allProducts
            .filter(p => p.category === category && p.id !== currentId)
            .slice(0, 4);

        // If not enough related in same category, pick random
        if (related.length < 4) {
            const extra = allProducts
                .filter(p => p.id !== currentId && !related.includes(p))
                .slice(0, 4 - related.length);
            related.push(...extra);
        }

        related.forEach(p => container.appendChild(createProductCard(p)));
    }

    function toggleWishlistPDP() {
        if (!currentProduct) return;
        const id = currentProduct.id;
        const index = wishlist.indexOf(id);
        if (index > -1) {
            wishlist.splice(index, 1);
            showToast('Removed from wishlist');
        } else {
            wishlist.push(id);
            showToast('Added to wishlist');
        }
        localStorage.setItem('woodnest_wishlist', JSON.stringify(wishlist));
        updateWishlistCount();

        // Refresh UI
        const btn = document.getElementById('pdpWishlistBtn');
        const isWishlisted = wishlist.includes(id);
        btn.innerText = isWishlisted ? '❤️ Remove from Wishlist' : '♡ Add to Wishlist';
        btn.className = isWishlisted ? 'btn btn-outline btn-ripple' : 'btn btn-primary btn-ripple';
    }

    function contactSales() {
        if (!currentProduct) return;
        const message = `Hello WoodNest, I am interested in the ${currentProduct.name} (₹${currentProduct.price.toLocaleString('en-IN')}). Could you provide more details?`;
        window.open(`https://wa.me/919933447711?text=${encodeURIComponent(message)}`, '_blank');
    }

    // ============ RENDER FUNCTIONS ============
    function renderFeaturedProducts() {
        const container = document.getElementById('featuredProducts');
        if (!container) return;
        container.innerHTML = '';
        const featured = allProducts.slice(0, 6);
        featured.forEach(p => container.appendChild(createProductCard(p)));
    }

    function renderAllProducts(filter = 'all') {
        const container = document.getElementById('allProductsGrid');
        if (!container) return;
        container.innerHTML = '';
        let filtered = allProducts;
        if (filter !== 'all') {
            filtered = allProducts.filter(p =>
                p.category === filter || p.fabric === filter || p.color === filter
            );
        }
        filtered.forEach(p => container.appendChild(createProductCard(p)));
    }

    function renderWishlist() {
        const container = document.getElementById('wishlistGrid');
        const emptyMsg = document.getElementById('wishlistEmpty');
        if (!container) return;
        container.innerHTML = '';
        const items = allProducts.filter(p => wishlist.includes(p.id));
        if (items.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
        } else {
            if (emptyMsg) emptyMsg.style.display = 'none';
            items.forEach(p => container.appendChild(createProductCard(p)));
        }
    }

    function updateWishlistCount() {
        const count = wishlist.length;
        const badges = document.querySelectorAll('#wishlistCount, #mobileWishlistCount');
        badges.forEach(b => {
            if (b) b.textContent = count;
        });
        const badge = document.getElementById('wishlistCount');
        if (badge && count > 0) {
            badge.classList.add('pulse');
            setTimeout(() => badge.classList.remove('pulse'), 400);
        }
    }

    // ============ WISHLIST LOGIC ============
    function toggleWishlist(productId, btnElement) {
        const index = wishlist.indexOf(productId);
        if (index > -1) {
            wishlist.splice(index, 1);
            if (btnElement) btnElement.classList.remove('liked');
            if (btnElement) btnElement.innerHTML = '♡';
            showToast('Removed from Wishlist');
        } else {
            wishlist.push(productId);
            if (btnElement) btnElement.classList.add('liked');
            if (btnElement) btnElement.innerHTML = '❤️';
            showToast('Added to Wishlist! ♡');
        }
        localStorage.setItem('woodnest_wishlist', JSON.stringify(wishlist));
        updateWishlistCount();
        // Refresh current page
        const activePage = document.querySelector('.page.active');
        if (activePage && activePage.id === 'page-wishlist') renderWishlist();
        if (activePage && activePage.id === 'page-shop') renderAllProducts(currentFilter);
        if (activePage && activePage.id === 'page-home') renderFeaturedProducts();
    }
    window.toggleWishlist = toggleWishlist;

    function addToWishlist(productId) {
        if (!wishlist.includes(productId)) {
            wishlist.push(productId);
            localStorage.setItem('woodnest_wishlist', JSON.stringify(wishlist));
            updateWishlistCount();
        }
    }
    window.addToWishlist = addToWishlist;

    // ============ QUICK VIEW ============
    function openQuickView(productId) {
        currentQuickViewId = productId;
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        document.getElementById('qvImage').innerHTML = `<img src="${product.image}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
        document.getElementById('qvName').textContent = product.name;
        document.getElementById('qvPrice').textContent = '₹' + product.price.toLocaleString('en-IN');
        document.getElementById('qvDesc').textContent = product.desc;
        const qvBtn = document.getElementById('qvWishlistBtn');
        qvBtn.textContent = wishlist.includes(productId) ? '❤️ In Wishlist' : '♡ Add to Wishlist';
        document.getElementById('quickViewModal').classList.add('active');
    }
    window.openQuickView = openQuickView;

    function closeQuickView() {
        document.getElementById('quickViewModal').classList.remove('active');
        currentQuickViewId = null;
    }
    window.closeQuickView = closeQuickView;

    function quickViewAddWishlist() {
        if (currentQuickViewId !== null) {
            addToWishlist(currentQuickViewId);
            document.getElementById('qvWishlistBtn').textContent = '❤️ In Wishlist';
            showToast('Added to Wishlist! ♡');
            updateWishlistCount();
        }
    }
    window.quickViewAddWishlist = quickViewAddWishlist;

    // Close modal on overlay click
    document.getElementById('quickViewModal').addEventListener('click', function (e) {
        if (e.target === this) closeQuickView();
    });

    // ============ FILTER ============
    function filterProducts(filter, btnElement) {
        currentFilter = filter;
        renderAllProducts(filter);
        // Update active buttons
        document.querySelectorAll('#filterBar .filter-btn').forEach(b => b.classList.remove(
            'active'));
        document.querySelectorAll('#filterBar .color-filter').forEach(c => c.classList.remove(
            'active'));
        if (btnElement) btnElement.classList.add('active');
        // If it's a color filter
        if (['brown', 'black', 'beige', 'tan'].includes(filter)) {
            document.querySelectorAll('#filterBar .color-filter').forEach(c => {
                if (c.style.background.toLowerCase().includes(filter) || (filter ===
                    'brown' && c.style.background === 'rgb(139, 94, 60)') || (
                        filter === 'black' && c.style.background === 'rgb(58, 58, 58)') ||
                    (filter === 'beige' && c.style.background === 'rgb(214, 200, 184)') ||
                    (filter === 'tan' && c.style.background === 'rgb(196, 154, 108)')) {
                    c.classList.add('active');
                }
            });
        }
    }
    window.filterProducts = filterProducts;

    // ============ TOAST ============
    function showToast(message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    window.showToast = showToast;

    // ============ PRODUCT DETAIL PAGE ============
    function openProductDetail(productId) {
        window.location.href = `product.html?id=${productId}`;
    }
    window.openProductDetail = openProductDetail;

    // Attach product detail navigation to card info clicks
    document.addEventListener('click', function (e) {
        const cardInfo = e.target.closest('.product-card-info');
        if (cardInfo) {
            const card = cardInfo.closest('.product-card');
            if (card) {
                const productId = parseInt(card.getAttribute('data-id'));
                if (!isNaN(productId)) {
                    openProductDetail(productId);
                }
            }
        }
    });

    // ============ SCROLL ANIMATIONS (GSAP) ============
    function initScrollAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        // Kill old triggers
        ScrollTrigger.getAll().forEach(t => t.kill());

        const scroller = window;

        // Fade up on scroll with a slight scale
        gsap.utils.toArray('[data-scroll]').forEach(el => {
            gsap.fromTo(el, { opacity: 0, y: 60, scale: 0.95 }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1.2,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: el,
                    scroller: window,
                    start: 'top 90%',
                    toggleActions: 'play none none reverse',
                }
            });
        });

        // Product cards stagger with 3D entrance
        gsap.utils.toArray('.products-grid').forEach(grid => {
            const cards = grid.querySelectorAll('.product-card');
            gsap.fromTo(cards, { opacity: 0, y: 100, rotationX: -15 }, {
                opacity: 1,
                y: 0,
                rotationX: 0,
                duration: 1.2,
                stagger: 0.1,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: grid,
                    scroller: window,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse',
                }
            });
        });


    }

    // Magnetic Button Effect
    function initMagneticButtons() {
        if (typeof gsap === 'undefined') return;
        const btns = document.querySelectorAll('.btn-ripple');
        btns.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                gsap.to(btn, {
                    x: x * 0.4,
                    y: y * 0.4,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            });
            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, {
                    x: 0,
                    y: 0,
                    duration: 0.7,
                    ease: 'elastic.out(1.2, 0.4)'
                });
            });
        });
    }

    // ============ HERO ANIMATION ============
    function animateHero() {
        if (typeof gsap === 'undefined') return;
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        tl.fromTo('.hero-tagline', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 0.2 })
            .fromTo('.hero-title .line span', { y: '100%', rotate: 5 }, { y: 0, rotate: 0, duration: 1.6, stagger: 0.2 }, '-=0.6')
            .to('.hero-content .btn', { opacity: 1, y: 0, scale: 1, duration: 1, stagger: 0.15 }, '-=1.2')
            .to('.scroll-indicator', { opacity: 1, y: 0, duration: 1 }, '-=0.8');
    }

    let sliderInterval;
    function initHeroSlider() {
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.indicator-dot');
        if (!slides.length) return;
        let currentSlide = 0;

        window.goToSlide = function (index) {
            slides[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            currentSlide = index;
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
            resetSliderInterval();
        };

        function resetSliderInterval() {
            clearInterval(sliderInterval);
            sliderInterval = setInterval(() => {
                goToSlide((currentSlide + 1) % slides.length);
            }, 6000);
        }

        resetSliderInterval();
    }

    // ============ HEADER SCROLL ============
    function handleHeaderScroll() {
        const header = document.getElementById('header');
        const activePage = document.querySelector('.page.active');
        if (!activePage) return;
        if (activePage.id === 'page-home') {
            const scrollY = window.scrollY;
            if (scrollY > 80) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        } else {
            header.classList.add('scrolled');
        }
    }

    // ============ MOUSE LIGHT EFFECT ============
    const lightFollow = document.getElementById('lightFollow');
    let mouseX = 0,
        mouseY = 0;
    let lightVisible = false;
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!lightVisible) {
            lightVisible = true;
            lightFollow.classList.add('visible');
        }
        lightFollow.style.left = mouseX + 'px';
        lightFollow.style.top = mouseY + 'px';
    });
    document.addEventListener('mouseleave', () => {
        lightVisible = false;
        lightFollow.classList.remove('visible');
    });

    // ============ BUTTON RIPPLE ============
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-ripple');
        if (!btn) return;
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    });

    // ============ HERO PARTICLES CANVAS ============
    function initParticles() {
        const canvas = document.getElementById('heroParticles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        const particles = [];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1 + 0.5,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.3 + 0.05
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(214,167,122,${p.opacity})`;
                ctx.fill();
            });
            requestAnimationFrame(animate);
        }
        animate();
        window.addEventListener('resize', () => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        });
    }

    // ============ INIT ============
    function init() {
        renderFeaturedProducts();
        updateWishlistCount();
        initHeroSlider();
        setTimeout(animateHero, 300);
        setTimeout(initScrollAnimations, 800);
        window.addEventListener('scroll', handleHeaderScroll, { passive: true });

        // Handle initial hash navigation
        const hash = window.location.hash.substring(1);
        if (hash) {
            setTimeout(() => {
                navigateTo(hash);
                if (locomotiveScrollInstance) locomotiveScrollInstance.update();
            }, 800);
        }

        // Handle hash change
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.substring(1);
            if (newHash) navigateTo(newHash);
        });

        // Handle resize
        window.addEventListener('resize', () => {
            if (locomotiveScrollInstance) locomotiveScrollInstance.update();
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        });
        // Initial header state
        handleHeaderScroll();

        // Set initial theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);

    // Expose for inline onclick
    window.toggleWishlist = toggleWishlist;
    window.addToWishlist = addToWishlist;
    window.openQuickView = openQuickView;
    window.closeQuickView = closeQuickView;
    window.quickViewAddWishlist = quickViewAddWishlist;
    window.filterProducts = filterProducts;
    window.showToast = showToast;
    window.openProductDetail = openProductDetail;
})();


// ============ FOOTER LOAD ============
document.getElementById("footer").innerHTML = `
<footer>
    <div class="footer-container">
        <!-- Brand Info -->
        <div class="footer-brand">
            <div class="footer-logo" onclick="navigateTo('home')" style="cursor: pointer;">
                <img src="asset/logo.png" alt="WoodNest Logo">
            </div>
            
            <div class="footer-socials">
                <a href="https://facebook.com" target="_blank" class="social-link" aria-label="Facebook"><i class="ph-bold ph-facebook-logo"></i></a>
                <a href="https://instagram.com" target="_blank" class="social-link" aria-label="Instagram"><i class="ph-bold ph-instagram-logo"></i></a>
                <a href="https://wa.me/919933447711" target="_blank" class="social-link" aria-label="WhatsApp"><i class="ph-fill ph-whatsapp-logo"></i></a>
            </div>
        </div>

        <!-- Links Grid -->
        <div class="footer-links-grid">
            <div class="footer-col">
                <h4>Collections</h4>
                <ul>
                    <li onclick="navigateTo('shop'); filterProducts('3-seater')">3-Seater Sofas</li>
                    <li onclick="navigateTo('shop'); filterProducts('l-shape')">L-Shape Sofas</li>
                    <li onclick="navigateTo('shop'); filterProducts('2-seater')">2-Seater Sofas</li>
                    <li onclick="navigateTo('shop'); filterProducts('1-seater')">1-Seater Sofas</li>
                    <li onclick="navigateTo('shop'); filterProducts('sofa-set')">Sofa Sets</li>
                </ul>
            </div>

            <div class="footer-col">
                <h4>Company</h4>
                <ul>
                    <li onclick="navigateTo('about')">About Us</li>
                    <li onclick="navigateTo('blog')">Our Journal</li>
                    <li onclick="navigateTo('customise')">Bespoke Designs</li>
                    <li onclick="navigateTo('contact')">Contact</li>
                </ul>
            </div>

            <div class="footer-col">
                <h4>Contact Us</h4>
                <ul class="contact-list">
                    <li>
                        <i class="ph-fill ph-map-pin"></i>
                        <span>Sevoke Road, Siliguri, West Bengal</span>
                    </li>
                    <li>
                        <i class="ph-fill ph-phone"></i>
                        <a href="tel:+919933447711">+91 99334 47711</a>
                    </li>
                    <li>
                        <i class="ph-fill ph-envelope"></i>
                        <a href="mailto:info@woodnest.in">info@woodnest.in</a>
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Divider -->
    <div class="footer-divider"></div>

    <!-- Bottom Bar -->
    <div class="footer-bottom">
        <p class="copyright">© 2026 WoodNest Luxury Furniture. All rights reserved.</p>
        <p class="credits">Crafted with ❤️ by <a href="https://www.nexvoraweb.in" target="_blank">NexvoraWeb</a></p>
    </div>
</footer>
`;