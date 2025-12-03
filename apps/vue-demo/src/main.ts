import { createApp } from 'vue';
import '@waltid/digital-credentials';
import App from './App.vue';
import './style.css';

const app = createApp(App);
app.config.compilerOptions.isCustomElement = (tag) => tag === 'digital-credentials-button';
app.mount('#app');
