import { createApp } from 'vue';
import '@waltid/digital-credentials';
import { installMocks } from '@waltid/dc-mock-utils/install-mocks';
import App from './App.vue';
import './style.css';

installMocks();

createApp(App).mount('#app');
