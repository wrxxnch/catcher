import { createRouter, createWebHistory } from 'vue-router'

import NotFound from './views/NotFound.vue';
import GerarView from './views/GerarView.vue'
import ComprovanteFakeView from './views/ComprovanteFakeView.vue';
import AcessosView from './views/AcessosView.vue';

const routes = [
    { path: '/', redirect: '/_gerar' },
    { path: '/_gerar', name: 'gerar', component: GerarView },
    { path: '/transacao', name: 'transacao', component: ComprovanteFakeView },
    { path: '/acessos', name: 'acessos', component: AcessosView },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
];

function getRouterBase() {
    const raw = import.meta.env.BASE_URL;
    if (raw && raw !== './' && raw !== '.') {
        return raw;
    }
    if (typeof window !== 'undefined') {
        const segments = window.location.pathname.split('/').filter(Boolean);
        const knownRoutes = ['acessos', '_gerar', 'transacao'];
        if (segments.length > 0 && knownRoutes.includes(segments[segments.length - 1])) {
            segments.pop();
        }
        return segments.length > 0 ? '/' + segments.join('/') + '/' : '/';
    }
    return '/';
}

const router = createRouter({
    history: createWebHistory(getRouterBase()),
    routes,
});

export default router;