(function() {
    this.scrollShadow = function() {
        var scroll_container    = arguments[0].querySelector('.scroll-window'),
            scroll_shadows      = arguments[0].querySelector('.scroll-shadow');

        if ( scroll_container.clientHeight === scroll_container.scrollHeight ) {
            scroll_shadows.classList.remove('top');
            scroll_shadows.classList.remove('bottom');
        }

        var scrollHandler = function(e) {
            if ( scroll_container.clientHeight === scroll_container.scrollHeight ) {
                scroll_shadows.classList.remove('top');
                scroll_shadows.classList.remove('bottom');
            }

            var scrollPos = scroll_container.scrollTop,
                scrollMax = scroll_container.scrollHeight - scroll_container.clientHeight;

            if ( scrollPos === 0 ) {
                scroll_shadows.classList.remove('top');
                scroll_shadows.classList.add('bottom');
            } else if ( scrollPos >= scrollMax ) {
                scroll_shadows.classList.remove('bottom');
                scroll_shadows.classList.add('top');
            } else {
                scroll_shadows.classList.add('top', 'bottom');
            }
        };

        scroll_container.addEventListener('scroll', scrollHandler);
    };

    document.addEventListener('DOMContentLoaded', function() {
        var shadowBoxes = document.querySelectorAll('[data-js-scrollshadow]');
        shadowBoxes.forEach(function(shadow_box) {
            new scrollShadow(shadow_box);
        });
    });
})();
