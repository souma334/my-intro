document.addEventListener('DOMContentLoaded', () => {
    // スムーズスクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // スクロールアニメーション（要素ごとの発火）
    const animElements = document.querySelectorAll('.scroll-anim');
    
    const animOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const animObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // 一度発火したら監視を解除する
                observer.unobserve(entry.target);
            }
        });
    }, animOptions);

    animElements.forEach(element => {
        animObserver.observe(element);
    });
});
