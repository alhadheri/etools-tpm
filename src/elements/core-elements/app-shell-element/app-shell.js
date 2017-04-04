Polymer({

    is: 'app-shell',

    behaviors: [
        etoolsBehaviors.LoadingBehavior
    ],

    properties: {

        page: {
            type: String,
            reflectToAttribute: true,
            observer: '_pageChanged'
        },

        narrow: {
            type: Boolean,
            reflectToAttribute: true
        },

        _toast: {
            type: Object,
            value: null
        },

        _toastQueue: {
            type: Array,
            value: function () {
                return [];
            }
        }

    },

    observers: [
        '_routePageChanged(routeData.page)'
    ],

    listeners: {
        'global-loading': '_handleGlobalLoading',
        'toast': 'queueToast',
        'drawer': 'toggleDrawer',
        '404': '_pageNotFound',
        'user-profile-loaded': '_profileLoaded'
    },

    attached: function () {
        this.fire('global-loading', {message: 'Loading...', active: true});
        if (this.route.path === '/') {
            this.set('route.path', '/partners/list');
        }
    },

    toggleDrawer: function () {
        this.$.drawer.toggle();
    },

    queueToast: function (e, detail) {
        if (!this._toast) {
            this._toast = document.createElement('paper-toast');
            this.listen(this._toast, 'iron-overlay-closed', 'dequeueToast');
            Polymer.dom(this.$.layout).appendChild(this._toast);
            Polymer.dom.flush();
        }
        if (!this._toastQueue.length) {
            this.push('_toastQueue', detail);
            this._toast.show(detail);
        } else {
            this.push('_toastQueue', detail);
        }
    },

    dequeueToast: function () {
        this.shift('_toastQueue');
        if (this._toastQueue.length) {
            this._toast.show(this._toastQueue[0]);
        }
    },

    _routePageChanged: function (page) {
        if (!this.initLoadingComplete) return;
        this.page = page || 'partners';
    },

    _pageChanged: function (page) {
        var resolvedPageUrl;
        if (page === 'not-found') {
            resolvedPageUrl = this.resolveUrl('../../pages/not-found-page-view/not-found-page-view.html');
        } else {
            resolvedPageUrl = this.resolveUrl(`/elements/pages/${page}-page-components/${page}-page-main/${page}-page-main.html`);
        }
        this.importHref(resolvedPageUrl, () => {
            if (!this.initLoadingComplete) {
                this.initLoadingComplete = true;
                this.fire('global-loading');
            }
        }, this._pageNotFound, true);
    },

    _pageNotFound: function () {
        this.page = 'not-found';
        this.fire('toast', {text: 'Oops you hit a 404!'});
    },

    _profileLoaded: function() {
        if (this.routeData) this.page = this.routeData.page || 'partners';
    },

    _handleGlobalLoading: function(event) {
        if (!event.detail) return;
        let loadingElement =  this.$['global-loading'];

        if (typeof event.detail.message === 'string' && event.detail.message !== '') {
            loadingElement.loadingText = event.detail.message;
        }
        loadingElement.active = event.detail.active;
    }

});